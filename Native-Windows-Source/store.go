package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

const (
	appName    = "KeyClick Tracker"
	appVersion = "1.1.0"
	// The data folder keeps the original name on purpose: users upgrading from
	// KeyScope 1.x keep their existing activity.json without any migration.
	dataFolderName = "KeyScope"
	storeVersion   = 3
)

// ---------------------------------------------------------------- data model

type HourBucket struct {
	Keys       map[string]uint64 `json:"keys"`
	Mouse      map[string]uint64 `json:"mouse"`
	Scroll     map[string]uint64 `json:"scroll"`
	ScrollUnit map[string]uint64 `json:"scroll_units"`
}

// DayRoll is a compact per-day summary of minute-level activity. It exists so
// WPM / CPM can be computed without keeping a record for every minute.
type DayRoll struct {
	Keys      uint64  `json:"keys"`
	Chars     uint64  `json:"chars"`
	Clicks    uint64  `json:"clicks"`
	Scrolls   uint64  `json:"scrolls"`
	ActiveMin uint32  `json:"active_min"`
	TypeMin   uint32  `json:"type_min"`
	ClickMin  uint32  `json:"click_min"`
	WPMSum    float64 `json:"wpm_sum"`
	CPMSum    float64 `json:"cpm_sum"`
	PeakWPM   float64 `json:"peak_wpm"`
	PeakCPM   float64 `json:"peak_cpm"`
}

type Settings struct {
	Theme        string `json:"theme"`
	Font         string `json:"font"`
	FontScale    int    `json:"font_scale"` // percent, 85..130
	Animations   bool   `json:"animations"`
	LiveNumbers  bool   `json:"live_numbers"`
	GoalKeys     uint64 `json:"goal_keys"`
	GoalClicks   uint64 `json:"goal_clicks"`
	BreakMinutes int    `json:"break_minutes"` // 0 = off
	StartHidden  bool   `json:"start_hidden"`
	UserName     string `json:"user_name"`
	Clock24      bool   `json:"clock_24h"`
	TypingUnit   string `json:"typing_unit"` // wps | wpm | wph
	ClickUnit    string `json:"click_unit"`  // cps | cpm | cph
	OverlayOn    bool   `json:"overlay_on"`
	OverlaySet   bool   `json:"overlay_set"` // true once the user has positioned the overlay
	OverlayX     int    `json:"overlay_x"`
	OverlayY     int    `json:"overlay_y"`
	OverlayW     int    `json:"overlay_w"`
	OverlayH     int    `json:"overlay_h"`
}

func defaultSettings() *Settings {
	return &Settings{Theme: "classic", Font: "segoe", FontScale: 100, Animations: true, LiveNumbers: true, GoalKeys: 8000, GoalClicks: 1500,
		Clock24: false, TypingUnit: "wpm", ClickUnit: "cpm", OverlayW: 250, OverlayH: 92}
}

type Store struct {
	Version     int                    `json:"version"`
	AppVersion  string                 `json:"app_version,omitempty"`
	CloseToTray bool                   `json:"close_to_tray"`
	Buckets     map[string]*HourBucket `json:"buckets"`
	Days        map[string]*DayRoll    `json:"days,omitempty"`
	Settings    *Settings              `json:"settings,omitempty"`
}

type minuteAcc struct {
	start                       time.Time
	keys, chars, clicks, scroll uint64
}

type ringSlot struct {
	sec                int64
	chars, clicks, key uint64
}

// pendingDelta is what has happened since the last live frame was pushed.
type pendingDelta struct {
	Keys   uint64            `json:"k"`
	Chars  uint64            `json:"ch"`
	Clicks uint64            `json:"c"`
	Scroll uint64            `json:"s"`
	Units  uint64            `json:"u"`
	KeyIDs map[string]uint64 `json:"ki,omitempty"`
	MsIDs  map[string]uint64 `json:"mi,omitempty"`
	ScIDs  map[string]uint64 `json:"si,omitempty"`
}

func (p *pendingDelta) empty() bool { return p.Keys+p.Clicks+p.Scroll == 0 }

var (
	store      Store
	storeMu    sync.RWMutex
	dataDir    string
	dataPath   string
	logger     *log.Logger
	loadFailed bool
	dirty      atomic.Bool

	cur        minuteAcc
	ring       [16]ringSlot
	pend       pendingDelta
	sessStart  = time.Now()
	sessKeys   uint64
	sessChars  uint64
	sessClicks uint64
	sessScroll uint64
	sessActive uint32
	signalLive = make(chan struct{}, 1)
)

func logLine(s string) {
	if logger != nil {
		logger.Println(s)
	}
}

func nowStamp() string { return time.Now().Format("20060102-150405") }

// ------------------------------------------------------------------ helpers

func isCharKey(id string) bool {
	if len(id) == 1 {
		return true
	}
	switch id {
	case "Space", "Semicolon", "Equal", "Comma", "Minus", "Period", "Slash", "Backquote", "BracketLeft", "Backslash", "BracketRight", "Quote", "IntlBackslash",
		"NumpadAdd", "NumpadSubtract", "NumpadMultiply", "NumpadDivide", "NumpadDecimal":
		return true
	}
	return strings.HasPrefix(id, "Numpad") && len(id) == 7
}

func newBucket() *HourBucket {
	return &HourBucket{Keys: map[string]uint64{}, Mouse: map[string]uint64{}, Scroll: map[string]uint64{}, ScrollUnit: map[string]uint64{}}
}

func (b *HourBucket) fix() {
	if b.Keys == nil {
		b.Keys = map[string]uint64{}
	}
	if b.Mouse == nil {
		b.Mouse = map[string]uint64{}
	}
	if b.Scroll == nil {
		b.Scroll = map[string]uint64{}
	}
	if b.ScrollUnit == nil {
		b.ScrollUnit = map[string]uint64{}
	}
}

func (s *Store) normalize() {
	if s.Buckets == nil {
		s.Buckets = map[string]*HourBucket{}
	}
	for k, b := range s.Buckets {
		if b == nil {
			delete(s.Buckets, k)
			continue
		}
		b.fix()
	}
	if s.Days == nil {
		s.Days = map[string]*DayRoll{}
	}
	if s.Settings == nil {
		s.Settings = defaultSettings()
	}
	st := s.Settings
	if st.Theme == "" {
		st.Theme = "classic"
	}
	if st.Font == "" {
		st.Font = "segoe"
	}
	if st.FontScale < 85 || st.FontScale > 130 {
		st.FontScale = 100
	}
	if st.BreakMinutes < 0 || st.BreakMinutes > 480 {
		st.BreakMinutes = 0
	}
	switch st.TypingUnit {
	case "wps", "wpm", "wph":
	default:
		st.TypingUnit = "wpm"
	}
	switch st.ClickUnit {
	case "cps", "cpm", "cph":
	default:
		st.ClickUnit = "cpm"
	}
	if r := []rune(strings.TrimSpace(st.UserName)); len(r) > 32 {
		st.UserName = string(r[:32])
	} else {
		st.UserName = strings.TrimSpace(st.UserName)
	}
	if st.OverlayW < 150 || st.OverlayW > 900 {
		st.OverlayW = 250
	}
	if st.OverlayH < 56 || st.OverlayH > 500 {
		st.OverlayH = 92
	}
}

func dayKey(t time.Time) string { return t.In(time.Local).Format("2006-01-02") }

// ------------------------------------------------------------ recording path

// record is called from the low-level hooks, so it must stay fast.
func record(kind, id string, units uint64) {
	if isPaused() {
		return
	}
	now := time.Now()
	storeMu.Lock()
	b := store.Buckets[now.Truncate(time.Hour).Format(time.RFC3339)]
	if b == nil {
		b = newBucket()
		store.Buckets[now.Truncate(time.Hour).Format(time.RFC3339)] = b
	}
	rollMinuteLocked(now, false)
	var chars, keys, clicks, scrolls uint64
	switch kind {
	case "key":
		b.Keys[id]++
		keys = 1
		if isCharKey(id) {
			chars = 1
		}
		pend.Keys++
		pend.Chars += chars
		if pend.KeyIDs == nil {
			pend.KeyIDs = map[string]uint64{}
		}
		pend.KeyIDs[id]++
	case "mouse":
		b.Mouse[id]++
		clicks = 1
		pend.Clicks++
		if pend.MsIDs == nil {
			pend.MsIDs = map[string]uint64{}
		}
		pend.MsIDs[id]++
	case "scroll":
		b.Scroll[id]++
		b.ScrollUnit[id] += units
		scrolls = 1
		pend.Scroll++
		pend.Units += units
		if pend.ScIDs == nil {
			pend.ScIDs = map[string]uint64{}
		}
		pend.ScIDs[id]++
	}
	if cur.keys+cur.clicks+cur.scroll == 0 {
		sessActive++
	}
	cur.keys += keys
	cur.chars += chars
	cur.clicks += clicks
	cur.scroll += scrolls
	sessKeys += keys
	sessChars += chars
	sessClicks += clicks
	sessScroll += scrolls
	sec := now.Unix()
	slot := &ring[sec%int64(len(ring))]
	if slot.sec != sec {
		*slot = ringSlot{sec: sec}
	}
	slot.chars += chars
	slot.clicks += clicks
	slot.key += keys
	dirty.Store(true)
	storeMu.Unlock()
	select {
	case signalLive <- struct{}{}:
	default:
	}
}

// rollMinuteLocked folds the finished minute into its day summary. When force
// is true (shutdown) the running minute is folded regardless of the clock.
func rollMinuteLocked(now time.Time, force bool) {
	ms := now.Truncate(time.Minute)
	if !force && cur.start.Equal(ms) {
		return
	}
	if cur.keys+cur.clicks+cur.scroll > 0 && !cur.start.IsZero() {
		foldMinute(dayFor(cur.start), cur)
	}
	cur = minuteAcc{start: ms}
}

func dayFor(t time.Time) *DayRoll {
	k := dayKey(t)
	d := store.Days[k]
	if d == nil {
		d = &DayRoll{}
		store.Days[k] = d
	}
	return d
}

func foldMinute(d *DayRoll, m minuteAcc) {
	d.Keys += m.keys
	d.Chars += m.chars
	d.Clicks += m.clicks
	d.Scrolls += m.scroll
	d.ActiveMin++
	if m.chars >= 5 {
		w := float64(m.chars) / 5
		d.TypeMin++
		d.WPMSum += w
		if w > d.PeakWPM {
			d.PeakWPM = w
		}
	}
	if m.clicks >= 1 {
		c := float64(m.clicks)
		d.ClickMin++
		d.CPMSum += c
		if c > d.PeakCPM {
			d.PeakCPM = c
		}
	}
}

// liveRates returns the current typing speed (words per minute) and click
// rate (clicks per minute) measured over a sliding window of up to 10 seconds.
func liveRates(now time.Time) (wpm, cpm, kpm float64) {
	storeMu.RLock()
	defer storeMu.RUnlock()
	sec := now.Unix()
	var chars, clicks, keys uint64
	oldest := sec
	for _, s := range ring {
		if s.sec > sec-10 && s.sec <= sec && (s.chars+s.clicks+s.key) > 0 {
			chars += s.chars
			clicks += s.clicks
			keys += s.key
			if s.sec < oldest {
				oldest = s.sec
			}
		}
	}
	span := float64(sec - oldest + 1)
	if span < 3 {
		span = 3
	}
	return float64(chars) * 60 / 5 / span, float64(clicks) * 60 / span, float64(keys) * 60 / span
}

// ---------------------------------------------------------------- persistence

func openDataDir() {
	dataDir = os.Getenv("KEYCLICK_DATA_DIR") // test override; never set in normal use
	if dataDir == "" {
		base := os.Getenv("LOCALAPPDATA")
		if base == "" {
			base, _ = os.UserConfigDir()
		}
		dataDir = filepath.Join(base, dataFolderName)
	}
	_ = os.MkdirAll(dataDir, 0700)
	dataPath = filepath.Join(dataDir, "activity.json")
	if f, err := os.OpenFile(filepath.Join(dataDir, "keyscope.log"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600); err == nil {
		logger = log.New(f, appName+" ", log.LstdFlags)
	}
}

func backupDir() string { d := filepath.Join(dataDir, "Backups"); _ = os.MkdirAll(d, 0700); return d }

func copyFile(src, dst string) error {
	b, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, b, 0600)
}

// backupNow copies the data file to a new, clearly named file. It never
// overwrites an existing backup.
func backupNow(label string) (string, error) {
	if _, err := os.Stat(dataPath); err != nil {
		return "", err
	}
	name := fmt.Sprintf("activity-%s-%s.json", label, nowStamp())
	dst := filepath.Join(backupDir(), name)
	for i := 2; ; i++ {
		if _, err := os.Stat(dst); err != nil {
			break
		}
		dst = filepath.Join(backupDir(), fmt.Sprintf("activity-%s-%s-%d.json", label, nowStamp(), i))
	}
	return dst, copyFile(dataPath, dst)
}

func latestBackup() string {
	es, err := os.ReadDir(backupDir())
	if err != nil {
		return ""
	}
	var names []string
	for _, e := range es {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".json") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)
	for i := len(names) - 1; i >= 0; i-- {
		b, err := os.ReadFile(filepath.Join(backupDir(), names[i]))
		var probe Store
		if err == nil && json.Unmarshal(b, &probe) == nil && probe.Buckets != nil {
			return filepath.Join(backupDir(), names[i])
		}
	}
	return ""
}

func loadStore() {
	openDataDir()
	store = Store{Version: storeVersion, CloseToTray: true}
	b, err := os.ReadFile(dataPath)
	switch {
	case err == nil:
		var tmp Store
		if e := json.Unmarshal(b, &tmp); e != nil {
			// Corrupt file: keep it for inspection, never overwrite it silently.
			aside := dataPath + ".corrupt-" + nowStamp()
			_ = os.WriteFile(aside, b, 0600)
			logLine("activity.json unreadable (" + e.Error() + "); preserved as " + aside)
			if lb := latestBackup(); lb != "" {
				if bb, e2 := os.ReadFile(lb); e2 == nil && json.Unmarshal(bb, &tmp) == nil {
					logLine("restored from backup " + lb)
					store = tmp
				}
			}
		} else {
			store = tmp
		}
	case os.IsNotExist(err):
		logLine("no existing data file; starting fresh")
	default:
		loadFailed = true // do not risk overwriting a file we could not read
		logLine("could not read activity.json: " + err.Error())
	}
	prevVersion, prevApp := store.Version, store.AppVersion
	store.normalize()
	if !loadFailed {
		if _, e := os.Stat(dataPath); e == nil && (prevApp != appVersion || prevVersion < storeVersion) {
			if p, e := backupNow("before-v" + appVersion); e == nil {
				logLine("pre-update backup: " + p)
			}
		}
		dailyBackup()
	}
	store.Version = storeVersion
	store.AppVersion = appVersion
	cur = minuteAcc{start: time.Now().Truncate(time.Minute)}
}

func dailyBackup() {
	if _, err := os.Stat(dataPath); err != nil {
		return
	}
	dst := filepath.Join(backupDir(), "activity-daily-"+time.Now().Format("2006-01-02")+".json")
	if _, err := os.Stat(dst); err == nil {
		return
	}
	_ = copyFile(dataPath, dst)
	es, _ := os.ReadDir(backupDir())
	var daily []string
	for _, e := range es {
		if strings.HasPrefix(e.Name(), "activity-daily-") {
			daily = append(daily, e.Name())
		}
	}
	sort.Strings(daily)
	for len(daily) > 14 { // keep two weeks of daily snapshots; other backups are never pruned
		_ = os.Remove(filepath.Join(backupDir(), daily[0]))
		daily = daily[1:]
	}
}

func saveStore() error {
	if loadFailed {
		return fmt.Errorf("data file was unreadable at start; not overwriting it")
	}
	storeMu.Lock()
	rollMinuteLocked(time.Now(), false)
	b, err := json.Marshal(&store)
	storeMu.Unlock()
	if err != nil {
		return err
	}
	tmp := dataPath + ".tmp"
	if err = os.WriteFile(tmp, b, 0600); err != nil {
		return err
	}
	if err = os.Rename(tmp, dataPath); err != nil { // atomic replace on Windows
		_ = os.Remove(tmp)
		return fmt.Errorf("replace statistics file: %v", err)
	}
	return nil
}

func flushForExit() {
	storeMu.Lock()
	rollMinuteLocked(time.Now(), true)
	storeMu.Unlock()
	_ = saveStore()
}
