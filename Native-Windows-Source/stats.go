package main

import (
	"fmt"
	"sort"
	"time"
)

type Totals struct {
	Keys           uint64 `json:"keys"`
	Clicks         uint64 `json:"clicks"`
	Scrolls        uint64 `json:"scrolls"`
	Events         uint64 `json:"events"`
	ScrollDistance uint64 `json:"scrollDistance"`
	Chars          uint64 `json:"chars"`
}
type SeriesPoint struct {
	Label   string `json:"label"`
	Key     string `json:"key"`
	Keys    uint64 `json:"keys"`
	Clicks  uint64 `json:"clicks"`
	Scrolls uint64 `json:"scrolls"`
	Events  uint64 `json:"events"`
}
type StatItem struct {
	ID    string `json:"id"`
	Count uint64 `json:"count"`
}
type HourStat struct {
	T       int    `json:"t"`
	Keys    uint64 `json:"keys"`
	Clicks  uint64 `json:"clicks"`
	Scrolls uint64 `json:"scrolls"`
}

// Rates holds typing / clicking speed. "Overall" divides by every minute that
// had any input; "Avg" averages only the minutes of that kind (typing minutes
// need at least 5 characters; click minutes at least one click).
type Rates struct {
	OverallWPM    float64 `json:"overallWpm"`
	AvgWPM        float64 `json:"avgWpm"`
	PeakWPM       float64 `json:"peakWpm"`
	OverallCPM    float64 `json:"overallCpm"`
	AvgCPM        float64 `json:"avgCpm"`
	PeakCPM       float64 `json:"peakCpm"`
	OverallKPM    float64 `json:"overallKpm"`
	ActiveMinutes uint32  `json:"activeMinutes"`
	TypeMinutes   uint32  `json:"typeMinutes"`
	ClickMinutes  uint32  `json:"clickMinutes"`
}
type Streak struct {
	Current int `json:"current"`
	Longest int `json:"longest"`
	Days    int `json:"activeDays"`
}
type Today struct {
	Keys   uint64 `json:"keys"`
	Clicks uint64 `json:"clicks"`
}
type Session struct {
	Keys     uint64  `json:"keys"`
	Clicks   uint64  `json:"clicks"`
	Scrolls  uint64  `json:"scrolls"`
	Minutes  uint32  `json:"activeMinutes"`
	WPM      float64 `json:"wpm"`
	CPM      float64 `json:"cpm"`
	StartedS int64   `json:"started"`
}

// Records are all-time bests, independent of the selected range. A day needs at
// least 5 typing (or clicking) minutes to qualify for "best day" so a single
// lucky minute does not win.
type Records struct {
	BestWPMDay  string  `json:"bestWpmDay"`
	BestWPMAvg  float64 `json:"bestWpmAvg"`
	PeakWPMDay  string  `json:"peakWpmDay"`
	PeakWPM     float64 `json:"peakWpm"`
	BestCPMDay  string  `json:"bestCpmDay"`
	BestCPMAvg  float64 `json:"bestCpmAvg"`
	PeakCPMDay  string  `json:"peakCpmDay"`
	PeakCPM     float64 `json:"peakCpm"`
	MostActive  string  `json:"mostActiveMinutesDay"`
	MostActiveM uint32  `json:"mostActiveMinutes"`
}

type StatsResponse struct {
	Records    Records       `json:"records"`
	Totals     Totals        `json:"totals"`
	Keys       []StatItem    `json:"keys"`
	Mouse      []StatItem    `json:"mouse"`
	Scroll     []StatItem    `json:"scroll"`
	Series     []SeriesPoint `json:"series"`
	HourOfDay  []HourStat    `json:"hourOfDay"`
	DayOfWeek  []HourStat    `json:"dayOfWeek"`
	Heatmap    [7][24]uint64 `json:"heatmap"`
	PeakDay    *SeriesPoint  `json:"peakDay,omitempty"`
	Rates      Rates         `json:"rates"`
	Streak     Streak        `json:"streak"`
	Today      Today         `json:"today"`
	Session    Session       `json:"session"`
	Unit       string        `json:"unit"`
	RangeLabel string        `json:"rangeLabel"`
	LiveNow    bool          `json:"includesNow"`
	FirstDay   string        `json:"firstDay"`
	Generated  string        `json:"generated"`
}

func first(q map[string][]string, k, d string) string {
	if v := q[k]; len(v) > 0 && v[0] != "" {
		return v[0]
	}
	return d
}
func midnight(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}
func startOfWeek(t time.Time) time.Time {
	d := int(t.Weekday())
	if d == 0 {
		d = 7
	}
	return midnight(t).AddDate(0, 0, -d+1)
}

func rangeBounds(q map[string][]string) (time.Time, time.Time, string) {
	now := time.Now()
	local := now.Location()
	name := first(q, "range", "last7")
	start, end := now.AddDate(0, 0, -7), now
	switch name {
	case "today":
		start = midnight(now)
	case "yesterday":
		start, end = midnight(now.AddDate(0, 0, -1)), midnight(now)
	case "last7":
		start = now.AddDate(0, 0, -7)
	case "last30":
		start = now.AddDate(0, 0, -30)
	case "thisweek":
		start = startOfWeek(now)
	case "lastweek":
		end = startOfWeek(now)
		start = end.AddDate(0, 0, -7)
	case "thismonth":
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, local)
	case "lastmonth":
		end = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, local)
		start = end.AddDate(0, -1, 0)
	case "thisquarter":
		m := time.Month(((int(now.Month())-1)/3)*3 + 1)
		start = time.Date(now.Year(), m, 1, 0, 0, 0, 0, local)
	case "lastquarter":
		m := time.Month(((int(now.Month())-1)/3)*3 + 1)
		end = time.Date(now.Year(), m, 1, 0, 0, 0, 0, local)
		start = end.AddDate(0, -3, 0)
	case "thisyear":
		start = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, local)
	case "lastyear":
		end = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, local)
		start = end.AddDate(-1, 0, 0)
	case "all":
		start = time.Time{}
	case "custom":
		if s := first(q, "from", ""); s != "" {
			if t, e := time.Parse(time.RFC3339, s); e == nil {
				start = t
			} else if t, e := time.ParseInLocation("2006-01-02", s, local); e == nil {
				start = t
			}
		}
		if s := first(q, "to", ""); s != "" {
			if t, e := time.Parse(time.RFC3339, s); e == nil {
				end = t
			} else if t, e := time.ParseInLocation("2006-01-02", s, local); e == nil {
				end = t.AddDate(0, 0, 1)
			}
		}
	}
	if name != "custom" && (name == "today" || name == "last7" || name == "last30" || name == "thisweek" || name == "thismonth" || name == "thisquarter" || name == "thisyear" || name == "all") {
		end = now
	}
	return start, end, name
}

func bucketFor(t time.Time, unit string) (string, string) {
	switch unit {
	case "hour":
		return t.Format("2006-01-02T15"), t.Format("Jan 2 · 3 PM")
	case "weekly":
		w := startOfWeek(t)
		return w.Format("2006-01-02"), "Week of " + w.Format("Jan 2")
	case "monthly":
		return t.Format("2006-01"), t.Format("Jan 2006")
	case "quarterly":
		q := ((int(t.Month()) - 1) / 3) + 1
		return fmt.Sprintf("%04d-Q%d", t.Year(), q), fmt.Sprintf("Q%d %d", q, t.Year())
	case "yearly":
		return t.Format("2006"), t.Format("2006")
	default:
		return t.Format("2006-01-02"), t.Format("Mon, Jan 2")
	}
}

func sumMap(m map[string]uint64) (n uint64) {
	for _, v := range m {
		n += v
	}
	return
}

func sortItems(m map[string]uint64) []StatItem {
	out := make([]StatItem, 0, len(m))
	for id, n := range m {
		out = append(out, StatItem{ID: id, Count: n})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count != out[j].Count {
			return out[i].Count > out[j].Count
		}
		return out[i].ID < out[j].ID
	})
	return out
}

func buildStats(q map[string][]string) StatsResponse {
	start, end, rangeName := rangeBounds(q)
	unit := first(q, "unit", "daily")
	switch unit {
	case "hour", "daily", "weekly", "monthly", "quarterly", "yearly":
	default:
		unit = "daily"
	}
	now := time.Now()
	out := StatsResponse{Unit: unit, RangeLabel: rangeName, LiveNow: !end.Before(now.Add(-2 * time.Second)),
		HourOfDay: make([]HourStat, 24), DayOfWeek: make([]HourStat, 7), Generated: now.Format(time.RFC3339)}
	for i := range out.HourOfDay {
		out.HourOfDay[i].T = i
	}
	for i := range out.DayOfWeek {
		out.DayOfWeek[i].T = i + 1
	}
	keyMap, mouseMap, scrollMap := map[string]uint64{}, map[string]uint64{}, map[string]uint64{}
	seriesMap := map[string]*SeriesPoint{}
	activeDays := map[string]bool{}
	todayKey := dayKey(now)

	storeMu.RLock()
	for k, b := range store.Buckets {
		bt, e := time.Parse(time.RFC3339, k)
		if e != nil {
			continue
		}
		local := bt.In(time.Local)
		if ev := sumMap(b.Keys) + sumMap(b.Mouse) + sumMap(b.Scroll); ev > 0 {
			activeDays[dayKey(local)] = true
			if dayKey(local) == todayKey {
				out.Today.Keys += sumMap(b.Keys)
				out.Today.Clicks += sumMap(b.Mouse)
			}
		}
		if bt.Before(start) || !bt.Before(end) {
			continue
		}
		sk, sl := bucketFor(local, unit)
		p := seriesMap[sk]
		if p == nil {
			p = &SeriesPoint{Key: sk, Label: sl}
			seriesMap[sk] = p
		}
		kn, mn, sn := sumMap(b.Keys), sumMap(b.Mouse), sumMap(b.Scroll)
		for id, n := range b.Keys {
			keyMap[id] += n
		}
		for id, n := range b.Mouse {
			mouseMap[id] += n
		}
		for id, n := range b.Scroll {
			scrollMap[id] += n
		}
		out.Totals.Keys += kn
		out.Totals.Clicks += mn
		out.Totals.Scrolls += sn
		out.Totals.ScrollDistance += sumMap(b.ScrollUnit)
		p.Keys += kn
		p.Clicks += mn
		p.Scrolls += sn
		h := local.Hour()
		dow := int(local.Weekday())
		if dow == 0 {
			dow = 7
		}
		out.HourOfDay[h].Keys += kn
		out.HourOfDay[h].Clicks += mn
		out.HourOfDay[h].Scrolls += sn
		out.DayOfWeek[dow-1].Keys += kn
		out.DayOfWeek[dow-1].Clicks += mn
		out.DayOfWeek[dow-1].Scrolls += sn
		out.Heatmap[dow-1][h] += kn + mn + sn
	}

	// Speed figures come from the per-day minute summaries (+ the running minute).
	var r Rates
	var chars, clicks, keys uint64
	var wpmSum, cpmSum float64
	startDay := midnight(start)
	addDay := func(d *DayRoll) {
		chars += d.Chars
		clicks += d.Clicks
		keys += d.Keys
		r.ActiveMinutes += d.ActiveMin
		r.TypeMinutes += d.TypeMin
		r.ClickMinutes += d.ClickMin
		wpmSum += d.WPMSum
		cpmSum += d.CPMSum
		if d.PeakWPM > r.PeakWPM {
			r.PeakWPM = d.PeakWPM
		}
		if d.PeakCPM > r.PeakCPM {
			r.PeakCPM = d.PeakCPM
		}
	}
	for k, d := range store.Days {
		rc := &out.Records
		if d.TypeMin >= 5 {
			if avg := d.WPMSum / float64(d.TypeMin); avg > rc.BestWPMAvg {
				rc.BestWPMAvg, rc.BestWPMDay = avg, k
			}
		}
		if d.ClickMin >= 5 {
			if avg := d.CPMSum / float64(d.ClickMin); avg > rc.BestCPMAvg {
				rc.BestCPMAvg, rc.BestCPMDay = avg, k
			}
		}
		if d.PeakWPM > rc.PeakWPM {
			rc.PeakWPM, rc.PeakWPMDay = d.PeakWPM, k
		}
		if d.PeakCPM > rc.PeakCPM {
			rc.PeakCPM, rc.PeakCPMDay = d.PeakCPM, k
		}
		if d.ActiveMin > rc.MostActiveM {
			rc.MostActiveM, rc.MostActive = d.ActiveMin, k
		}
		dt, e := time.ParseInLocation("2006-01-02", k, time.Local)
		if e != nil || dt.Before(startDay) || !dt.Before(end) {
			continue
		}
		addDay(d)
	}
	if cur.keys+cur.clicks+cur.scroll > 0 && !cur.start.Before(startDay) && cur.start.Before(end) {
		tmp := DayRoll{}
		foldMinute(&tmp, cur)
		addDay(&tmp)
	}
	out.Totals.Chars = chars
	if r.ActiveMinutes > 0 {
		r.OverallWPM = float64(chars) / 5 / float64(r.ActiveMinutes)
		r.OverallCPM = float64(clicks) / float64(r.ActiveMinutes)
		r.OverallKPM = float64(keys) / float64(r.ActiveMinutes)
	}
	if r.TypeMinutes > 0 {
		r.AvgWPM = wpmSum / float64(r.TypeMinutes)
	}
	if r.ClickMinutes > 0 {
		r.AvgCPM = cpmSum / float64(r.ClickMinutes)
	}
	out.Rates = r
	out.Session = Session{Keys: sessKeys, Clicks: sessClicks, Scrolls: sessScroll, Minutes: sessActive, StartedS: sessStart.Unix()}
	if sessActive > 0 {
		out.Session.WPM = float64(sessChars) / 5 / float64(sessActive)
		out.Session.CPM = float64(sessClicks) / float64(sessActive)
	}
	for k := range store.Buckets {
		if bt, e := time.Parse(time.RFC3339, k); e == nil {
			if d := dayKey(bt); out.FirstDay == "" || d < out.FirstDay {
				out.FirstDay = d
			}
		}
	}
	storeMu.RUnlock()

	out.Totals.Events = out.Totals.Keys + out.Totals.Clicks + out.Totals.Scrolls
	out.Keys, out.Mouse, out.Scroll = sortItems(keyMap), sortItems(mouseMap), sortItems(scrollMap)
	out.Series = make([]SeriesPoint, 0, len(seriesMap))
	for _, p := range seriesMap {
		p.Events = p.Keys + p.Clicks + p.Scrolls
		out.Series = append(out.Series, *p)
	}
	sort.Slice(out.Series, func(i, j int) bool { return out.Series[i].Key < out.Series[j].Key })
	if len(out.Series) > 0 {
		peak := out.Series[0]
		for _, p := range out.Series {
			if p.Events > peak.Events {
				peak = p
			}
		}
		out.PeakDay = &peak
	}
	out.Streak = computeStreak(activeDays, now)
	return out
}

func computeStreak(active map[string]bool, now time.Time) Streak {
	s := Streak{Days: len(active)}
	if len(active) == 0 {
		return s
	}
	days := make([]string, 0, len(active))
	for d := range active {
		days = append(days, d)
	}
	sort.Strings(days)
	run, longest := 0, 0
	var prev time.Time
	for _, d := range days {
		t, _ := time.ParseInLocation("2006-01-02", d, time.Local)
		if !prev.IsZero() && t.Sub(prev) < 36*time.Hour && t.After(prev) {
			run++
		} else {
			run = 1
		}
		if run > longest {
			longest = run
		}
		prev = t
	}
	s.Longest = longest
	// current streak counts back from today (or yesterday if today is still empty)
	d := midnight(now)
	if !active[d.Format("2006-01-02")] {
		d = d.AddDate(0, 0, -1)
	}
	for active[d.Format("2006-01-02")] {
		s.Current++
		d = d.AddDate(0, 0, -1)
	}
	return s
}
