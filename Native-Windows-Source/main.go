//go:build windows

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
	"unsafe"

	"github.com/jchv/go-webview2"
)

var (
	user32   = syscall.NewLazyDLL("user32.dll")
	kernel32 = syscall.NewLazyDLL("kernel32.dll")
	shell32  = syscall.NewLazyDLL("shell32.dll")
	gdi32    = syscall.NewLazyDLL("gdi32.dll")

	pRegisterClassExW      = user32.NewProc("RegisterClassExW")
	pCreateWindowExW       = user32.NewProc("CreateWindowExW")
	pDefWindowProcW        = user32.NewProc("DefWindowProcW")
	pGetMessageW           = user32.NewProc("GetMessageW")
	pTranslateMessage      = user32.NewProc("TranslateMessage")
	pDispatchMessageW      = user32.NewProc("DispatchMessageW")
	pPostQuitMessage       = user32.NewProc("PostQuitMessage")
	pPostMessageW          = user32.NewProc("PostMessageW")
	pSendMessageW          = user32.NewProc("SendMessageW")
	pLoadCursorW           = user32.NewProc("LoadCursorW")
	pLoadImageW            = user32.NewProc("LoadImageW")
	pDestroyWindow         = user32.NewProc("DestroyWindow")
	pSetWindowsHookExW     = user32.NewProc("SetWindowsHookExW")
	pUnhookWindowsHookEx   = user32.NewProc("UnhookWindowsHookEx")
	pCallNextHookEx        = user32.NewProc("CallNextHookEx")
	pGetCursorPos          = user32.NewProc("GetCursorPos")
	pCreatePopupMenu       = user32.NewProc("CreatePopupMenu")
	pAppendMenuW           = user32.NewProc("AppendMenuW")
	pTrackPopupMenu        = user32.NewProc("TrackPopupMenu")
	pDestroyMenu           = user32.NewProc("DestroyMenu")
	pSetForegroundWindow   = user32.NewProc("SetForegroundWindow")
	pMessageBoxW           = user32.NewProc("MessageBoxW")
	pFindWindowW           = user32.NewProc("FindWindowW")
	pShowWindow            = user32.NewProc("ShowWindow")
	pSetWindowLongPtrW     = user32.NewProc("SetWindowLongPtrW")
	pGetWindowLongPtrW     = user32.NewProc("GetWindowLongPtrW")
	pCallWindowProcW       = user32.NewProc("CallWindowProcW")
	pSetWindowPos          = user32.NewProc("SetWindowPos")
	pGetWindowRect         = user32.NewProc("GetWindowRect")
	pSetWindowRgn          = user32.NewProc("SetWindowRgn")
	pReleaseCapture        = user32.NewProc("ReleaseCapture")
	pIsZoomed              = user32.NewProc("IsZoomed")
	pIsWindowVisible       = user32.NewProc("IsWindowVisible")
	pGetDpiForWindow       = user32.NewProc("GetDpiForWindow")
	pGetSystemMetrics      = user32.NewProc("GetSystemMetrics")
	pGetSystemMetricsForDp = user32.NewProc("GetSystemMetricsForDpi")
	pCreateRoundRectRgn    = gdi32.NewProc("CreateRoundRectRgn")
	pGetModuleHandleW      = kernel32.NewProc("GetModuleHandleW")
	pGetLastError          = kernel32.NewProc("GetLastError")
	pCreateMutexW          = kernel32.NewProc("CreateMutexW")
	pShellNotifyIconW      = shell32.NewProc("Shell_NotifyIconW")
	pShellExecuteW         = shell32.NewProc("ShellExecuteW")
)

const (
	whKeyboardLL = 13
	whMouseLL    = 14
	wmKeyDown    = 0x0100
	wmKeyUp      = 0x0101
	wmSysKeyDown = 0x0104
	wmSysKeyUp   = 0x0105
	wmLButton    = 0x0201
	wmRButton    = 0x0204
	wmMButton    = 0x0207
	wmXButton    = 0x020B
	wmMouseWheel = 0x020A
	wmMouseHWhl  = 0x020E
	wmDestroy    = 0x0002
	wmSize       = 0x0005
	wmClose      = 0x0010
	wmEndSession = 0x0016
	wmGetMinMax  = 0x0024
	wmNCCalcSize = 0x0083
	wmNCLButton  = 0x00A1
	wmSetIcon    = 0x0080
	wmApp        = 0x8000
	wmTray       = wmApp + 17
	wmOpen       = wmApp + 18
	wmExit       = wmApp + 19
	wmLBtnDbl    = 0x0203
	wmRButtonUp  = 0x0205
	wmContextMen = 0x007B

	nimAdd, nimModify, nimDelete = 0, 1, 2
	nifMessage, nifIcon, nifTip  = 1, 2, 4
	nifInfo                      = 0x10
	niifInfo                     = 1
	mfString, mfSeparator        = 0, 0x800
	tpmRightButton, tpmReturnCmd = 0x2, 0x100
	swHide, swShow, swNormal     = 0, 5, 1
	swMinimize, swMaximize       = 6, 3
	swRestore                    = 9
	llkhfInjected, llkhfLowerIL  = 0x10, 0x02
	llmhfInjected, llmhfLowerIL  = 0x01, 0x02

	gwlStyle        = -16
	gwlpWndProc     = -4
	wsThickFrame    = 0x00040000
	wsSysMenu       = 0x00080000
	wsMinimizeBox   = 0x00020000
	wsMaximizeBox   = 0x00010000
	wsClipChildren  = 0x02000000
	wsVisible       = 0x10000000
	wsOverlapped    = 0x00CF0000
	swpNoSize       = 0x1
	swpNoMove       = 0x2
	swpNoZOrder     = 0x4
	swpFrameChanged = 0x20
	swpShowWindow   = 0x40
	sizeMaximized   = 2
	sizeMinimized   = 1
	cornerRadiusDIP = 20
	iconResourceID  = 1
)

const (
	menuOpen   = 501
	menuToggle = 502
	menuExit   = 503
)

type point struct{ X, Y int32 }
type rect struct{ Left, Top, Right, Bottom int32 }
type winMsg struct {
	HWnd    uintptr
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      point
	Private uint32
}
type wndClassEx struct {
	Size       uint32
	Style      uint32
	WndProc    uintptr
	ClsExtra   int32
	WndExtra   int32
	Instance   uintptr
	Icon       uintptr
	Cursor     uintptr
	Background uintptr
	MenuName   *uint16
	ClassName  *uint16
	IconSmall  uintptr
}
type keyboardLL struct {
	VKCode, ScanCode, Flags, Time uint32
	ExtraInfo                     uintptr
}
type mouseLL struct {
	Pt        point
	MouseData uint32
	Flags     uint32
	Time      uint32
	ExtraInfo uintptr
}
type minMaxInfo struct{ Reserved, MaxSize, MaxPosition, MinTrack, MaxTrack point }
type notifyIconData struct {
	Size             uint32
	HWnd             uintptr
	ID               uint32
	Flags            uint32
	CallbackMessage  uint32
	Icon             uintptr
	Tip              [128]uint16
	State            uint32
	StateMask        uint32
	Info             [256]uint16
	TimeoutOrVersion uint32
	InfoTitle        [64]uint16
	InfoFlags        uint32
	GUID             [16]byte
	BalloonIcon      uintptr
}

var (
	hostHWND, mainHWND, oldMainProc uintptr
	appInstance                     uintptr
	trayAdded                       bool
	hookKeyboard, hookMouse         uintptr
	keyboardCallback, mouseCallback uintptr
	hostCallback, mainCallback      uintptr
	paused                          bool
	pausedMu                        sync.RWMutex
	pressed                         = map[uint32]bool{}
	exiting                         bool
	view                            webview2.WebView
	startHidden                     bool
	lastEvent                       atomic.Int64 // unix nanoseconds of the last recorded input
)

func utf16p(s string) *uint16 { p, _ := syscall.UTF16PtrFromString(s); return p }
func fixed(dst []uint16, s string) {
	v, _ := syscall.UTF16FromString(s)
	copy(dst, v)
	dst[len(dst)-1] = 0
}
func isPaused() bool   { pausedMu.RLock(); defer pausedMu.RUnlock(); return paused }
func setPaused(v bool) { pausedMu.Lock(); paused = v; pausedMu.Unlock() }
func hooksOK() bool    { return hookKeyboard != 0 && hookMouse != 0 }
func abs(v int) int {
	if v < 0 {
		return -v
	}
	return v
}

func openFolder(dir string) {
	pShellExecuteW.Call(0, uintptr(unsafe.Pointer(utf16p("open"))), uintptr(unsafe.Pointer(utf16p("explorer.exe"))), uintptr(unsafe.Pointer(utf16p(dir))), 0, swShow)
}

// ----------------------------------------------------------------- key naming

func keyName(vk, scan, flags uint32) string {
	switch {
	case vk == 0x10:
		if scan == 0x36 {
			return "ShiftRight"
		}
		return "ShiftLeft"
	case vk == 0x11:
		if flags&1 != 0 {
			return "ControlRight"
		}
		return "ControlLeft"
	case vk == 0x12:
		if flags&1 != 0 {
			return "AltRight"
		}
		return "AltLeft"
	case vk >= 0x41 && vk <= 0x5A, vk >= 0x30 && vk <= 0x39:
		return string(rune(vk))
	case vk >= 0x60 && vk <= 0x69:
		return fmt.Sprintf("Numpad%d", vk-0x60)
	case vk >= 0x70 && vk <= 0x87:
		return fmt.Sprintf("F%d", vk-0x6F)
	}
	m := map[uint32]string{0x08: "Backspace", 0x09: "Tab", 0x0D: "Enter", 0x13: "Pause", 0x14: "CapsLock", 0x1B: "Escape", 0x20: "Space", 0x21: "PageUp", 0x22: "PageDown", 0x23: "End", 0x24: "Home", 0x25: "ArrowLeft", 0x26: "ArrowUp", 0x27: "ArrowRight", 0x28: "ArrowDown", 0x2C: "PrintScreen", 0x2D: "Insert", 0x2E: "Delete", 0x5B: "MetaLeft", 0x5C: "MetaRight", 0x5D: "ContextMenu", 0x6A: "NumpadMultiply", 0x6B: "NumpadAdd", 0x6D: "NumpadSubtract", 0x6E: "NumpadDecimal", 0x6F: "NumpadDivide", 0x90: "NumLock", 0x91: "ScrollLock", 0xA0: "ShiftLeft", 0xA1: "ShiftRight", 0xA2: "ControlLeft", 0xA3: "ControlRight", 0xA4: "AltLeft", 0xA5: "AltRight", 0xBA: "Semicolon", 0xBB: "Equal", 0xBC: "Comma", 0xBD: "Minus", 0xBE: "Period", 0xBF: "Slash", 0xC0: "Backquote", 0xDB: "BracketLeft", 0xDC: "Backslash", 0xDD: "BracketRight", 0xDE: "Quote", 0xE2: "IntlBackslash"}
	if s, ok := m[vk]; ok {
		return s
	}
	return fmt.Sprintf("VK_%02X", vk)
}

// ---------------------------------------------------------------- input hooks

func keyboardProc(nCode int, wParam, lParam uintptr) uintptr {
	if nCode >= 0 && !isPaused() {
		k := (*keyboardLL)(unsafe.Pointer(lParam))
		if k.Flags&(llkhfInjected|llkhfLowerIL) == 0 {
			down := wParam == wmKeyDown || wParam == wmSysKeyDown
			up := wParam == wmKeyUp || wParam == wmSysKeyUp
			if down && !pressed[k.VKCode] {
				pressed[k.VKCode] = true // ignore auto-repeat while held
				lastEvent.Store(time.Now().UnixNano())
				record("key", keyName(k.VKCode, k.ScanCode, k.Flags), 0)
			} else if up {
				pressed[k.VKCode] = false
			}
		}
	}
	r, _, _ := pCallNextHookEx.Call(0, uintptr(nCode), wParam, lParam)
	return r
}

func mouseProc(nCode int, wParam, lParam uintptr) uintptr {
	if nCode >= 0 && !isPaused() {
		m := (*mouseLL)(unsafe.Pointer(lParam))
		if m.Flags&(llmhfInjected|llmhfLowerIL) == 0 {
			ev := func() { lastEvent.Store(time.Now().UnixNano()) }
			switch wParam {
			case wmLButton:
				ev()
				record("mouse", "left", 0)
			case wmRButton:
				ev()
				record("mouse", "right", 0)
			case wmMButton:
				ev()
				record("mouse", "middle", 0)
			case wmXButton:
				switch uint16(m.MouseData >> 16) {
				case 1:
					ev()
					record("mouse", "x1", 0)
				case 2:
					ev()
					record("mouse", "x2", 0)
				}
			case wmMouseWheel, wmMouseHWhl:
				d := int16(m.MouseData >> 16)
				u := uint64(abs(int(d)) / 120)
				id := ""
				switch {
				case wParam == wmMouseWheel && d > 0:
					id = "up"
				case wParam == wmMouseWheel && d < 0:
					id = "down"
				case d > 0:
					id = "right"
				case d < 0:
					id = "left"
				}
				if id != "" {
					ev()
					record("scroll", id, u)
				}
			}
		}
	}
	r, _, _ := pCallNextHookEx.Call(0, uintptr(nCode), wParam, lParam)
	return r
}

// ------------------------------------------------------------------ tray icon

func loadIcon(size int) uintptr {
	h, _, _ := pLoadImageW.Call(appInstance, iconResourceID, 1, uintptr(size), uintptr(size), 0)
	return h
}

func addTrayIcon() {
	if trayAdded {
		return
	}
	nid := notifyIconData{Size: uint32(unsafe.Sizeof(notifyIconData{})), HWnd: hostHWND, ID: 1, Flags: nifMessage | nifIcon | nifTip, CallbackMessage: wmTray, Icon: loadIcon(16)}
	fixed(nid.Tip[:], appName+" · private input analytics")
	r, _, _ := pShellNotifyIconW.Call(nimAdd, uintptr(unsafe.Pointer(&nid)))
	trayAdded = r != 0
}
func deleteTrayIcon() {
	if !trayAdded {
		return
	}
	nid := notifyIconData{Size: uint32(unsafe.Sizeof(notifyIconData{})), HWnd: hostHWND, ID: 1}
	pShellNotifyIconW.Call(nimDelete, uintptr(unsafe.Pointer(&nid)))
	trayAdded = false
}
func trayNotify(title, msg string) {
	if !trayAdded {
		return
	}
	nid := notifyIconData{Size: uint32(unsafe.Sizeof(notifyIconData{})), HWnd: hostHWND, ID: 1, Flags: nifInfo, InfoFlags: niifInfo}
	fixed(nid.Info[:], msg)
	fixed(nid.InfoTitle[:], title)
	pShellNotifyIconW.Call(nimModify, uintptr(unsafe.Pointer(&nid)))
}

func showTrayMenu() {
	m, _, _ := pCreatePopupMenu.Call()
	if m == 0 {
		return
	}
	pAppendMenuW.Call(m, mfString, menuOpen, uintptr(unsafe.Pointer(utf16p("Open "+appName))))
	label := "Pause monitoring"
	if isPaused() {
		label = "Resume monitoring"
	}
	pAppendMenuW.Call(m, mfString, menuToggle, uintptr(unsafe.Pointer(utf16p(label))))
	pAppendMenuW.Call(m, mfSeparator, 0, 0)
	pAppendMenuW.Call(m, mfString, menuExit, uintptr(unsafe.Pointer(utf16p("Exit "+appName))))
	var p point
	pGetCursorPos.Call(uintptr(unsafe.Pointer(&p)))
	pSetForegroundWindow.Call(hostHWND)
	cmd, _, _ := pTrackPopupMenu.Call(m, tpmRightButton|tpmReturnCmd, uintptr(p.X), uintptr(p.Y), 0, hostHWND, 0)
	pDestroyMenu.Call(m)
	switch cmd {
	case menuOpen:
		showMainWindow()
	case menuToggle:
		setPaused(!isPaused())
	case menuExit:
		shutdown()
	}
}

// --------------------------------------------------------------- main window

func dpiOf(h uintptr) int {
	if d, _, _ := pGetDpiForWindow.Call(h); d != 0 {
		return int(d)
	}
	return 96
}

func applyRoundedRegion(h uintptr) {
	if h == 0 {
		return
	}
	if z, _, _ := pIsZoomed.Call(h); z != 0 {
		pSetWindowRgn.Call(h, 0, 1)
		return
	}
	var r rect
	pGetWindowRect.Call(h, uintptr(unsafe.Pointer(&r)))
	d := cornerRadiusDIP * 2 * dpiOf(h) / 96
	rgn, _, _ := pCreateRoundRectRgn.Call(0, 0, uintptr(r.Right-r.Left+1), uintptr(r.Bottom-r.Top+1), uintptr(d), uintptr(d))
	pSetWindowRgn.Call(h, rgn, 1) // the system owns the region after this call
}

func jsEval(js string) {
	if view != nil {
		view.Dispatch(func() { view.Eval(js) })
	}
}

func showMainWindow() {
	if mainHWND == 0 {
		return
	}
	if ic, _, _ := pIsWindowVisible.Call(mainHWND); ic == 0 {
		pShowWindow.Call(mainHWND, swShow)
	}
	pShowWindow.Call(mainHWND, swRestore)
	pSetForegroundWindow.Call(mainHWND)
}

func mainProc(h, msg, wp, lp uintptr) uintptr {
	switch uint32(msg) {
	case wmNCCalcSize:
		if wp != 0 {
			// Remove the system frame entirely. When maximized, Windows places the window
			// a few pixels past the screen edge, so pull the client area back in.
			if z, _, _ := pIsZoomed.Call(h); z != 0 {
				r := (*rect)(unsafe.Pointer(lp))
				dpi := uintptr(dpiOf(h))
				f, _, _ := pGetSystemMetricsForDp.Call(32, dpi)
				p, _, _ := pGetSystemMetricsForDp.Call(92, dpi)
				b := int32(f + p)
				r.Left += b
				r.Top += b
				r.Right -= b
				r.Bottom -= b
			}
			return 0
		}
	case wmGetMinMax:
		mm := (*minMaxInfo)(unsafe.Pointer(lp))
		s := int32(dpiOf(h))
		mm.MinTrack = point{X: 940 * s / 96, Y: 620 * s / 96}
	case wmClose:
		storeMu.RLock()
		toTray := store.CloseToTray
		storeMu.RUnlock()
		if toTray && trayAdded {
			pShowWindow.Call(h, swHide)
			return 0
		}
		shutdown()
		return 0
	case wmSize:
		r, _, _ := pCallWindowProcW.Call(oldMainProc, h, msg, wp, lp)
		if wp != sizeMinimized {
			applyRoundedRegion(h)
			if wp == sizeMaximized {
				jsEval("document.documentElement.classList.add('maxed')")
			} else {
				jsEval("document.documentElement.classList.remove('maxed')")
			}
		}
		return r
	}
	r, _, _ := pCallWindowProcW.Call(oldMainProc, h, msg, wp, lp)
	return r
}

func frameless(h uintptr) {
	style := uintptr(wsThickFrame | wsSysMenu | wsMinimizeBox | wsMaximizeBox | wsClipChildren | wsVisible)
	pSetWindowLongPtrW.Call(h, ^uintptr(-gwlStyle-1), style)
	mainCallback = syscall.NewCallback(mainProc)
	oldMainProc, _, _ = pSetWindowLongPtrW.Call(h, ^uintptr(-gwlpWndProc-1), mainCallback)
	dpi := dpiOf(h)
	w, hh := 1280*dpi/96, 820*dpi/96
	sw, _, _ := pGetSystemMetrics.Call(0)
	sh, _, _ := pGetSystemMetrics.Call(1)
	if w > int(sw)-40 {
		w = int(sw) - 40
	}
	if hh > int(sh)-80 {
		hh = int(sh) - 80
	}
	pSetWindowPos.Call(h, 0, uintptr((int(sw)-w)/2), uintptr((int(sh)-hh)/2), uintptr(w), uintptr(hh), swpNoZOrder|swpFrameChanged)
	for _, kind := range []uintptr{0, 1} { // small + big icon
		sz := 16 + 16*kind
		pSendMessageW.Call(h, wmSetIcon, kind, loadIcon(int(sz)))
	}
	applyRoundedRegion(h)
}

func bindWindowControls() {
	post := func(f func()) { view.Dispatch(f) }
	_ = view.Bind("kcMinimize", func() { post(func() { pShowWindow.Call(mainHWND, swMinimize) }) })
	_ = view.Bind("kcMaximize", func() {
		post(func() {
			if z, _, _ := pIsZoomed.Call(mainHWND); z != 0 {
				pShowWindow.Call(mainHWND, swRestore)
			} else {
				pShowWindow.Call(mainHWND, swMaximize)
			}
		})
	})
	_ = view.Bind("kcClose", func() { post(func() { pPostMessageW.Call(mainHWND, wmClose, 0, 0) }) })
	_ = view.Bind("kcDrag", func() {
		post(func() {
			pReleaseCapture.Call()
			pPostMessageW.Call(mainHWND, wmNCLButton, 2, 0) // HTCAPTION
		})
	})
	edges := map[string]uintptr{"w": 10, "e": 11, "n": 12, "nw": 13, "ne": 14, "s": 15, "sw": 16, "se": 17}
	_ = view.Bind("kcResize", func(edge string) {
		if ht, ok := edges[edge]; ok {
			post(func() {
				pReleaseCapture.Call()
				pPostMessageW.Call(mainHWND, wmNCLButton, ht, 0)
			})
		}
	})
	_ = view.Bind("kcNotify", func(title, msg string) { trayNotify(title, msg) })
}

// ------------------------------------------------------------- host / lifecycle

func hostProc(h, msg, wp, lp uintptr) uintptr {
	switch uint32(msg) {
	case wmTray:
		ev := uint32(lp & 0xFFFF)
		if ev == wmLBtnDbl {
			showMainWindow()
			return 0
		}
		if ev == wmRButtonUp || ev == wmContextMen {
			showTrayMenu()
			return 0
		}
	case wmOpen:
		showMainWindow()
		return 0
	case wmExit:
		shutdown()
		return 0
	case wmEndSession:
		if wp != 0 {
			flushForExit() // Windows is logging off or shutting down: make sure counts are on disk
		}
		return 0
	case wmDestroy:
		pPostQuitMessage.Call(0)
		return 0
	}
	r, _, _ := pDefWindowProcW.Call(h, msg, wp, lp)
	return r
}

func createHostWindow(instance uintptr) error {
	className := utf16p("KeyClickTrackerHost")
	cursor, _, _ := pLoadCursorW.Call(0, 32512)
	hostCallback = syscall.NewCallback(hostProc)
	wc := wndClassEx{Size: uint32(unsafe.Sizeof(wndClassEx{})), WndProc: hostCallback, Instance: instance, Icon: loadIcon(32), IconSmall: loadIcon(16), Cursor: cursor, Background: 6, ClassName: className}
	if r, _, _ := pRegisterClassExW.Call(uintptr(unsafe.Pointer(&wc))); r == 0 {
		return fmt.Errorf("RegisterClassExW failed")
	}
	hostHWND, _, _ = pCreateWindowExW.Call(0, uintptr(unsafe.Pointer(className)), uintptr(unsafe.Pointer(utf16p(appName+" background host"))), wsOverlapped, 0, 0, 100, 100, 0, 0, instance, 0)
	if hostHWND == 0 {
		return fmt.Errorf("CreateWindowExW failed")
	}
	return nil
}

func shutdown() {
	if exiting {
		return
	}
	exiting = true
	logLine("Shutting down " + appName)
	flushForExit()
	deleteTrayIcon()
	if hookKeyboard != 0 {
		pUnhookWindowsHookEx.Call(hookKeyboard)
	}
	if hookMouse != 0 {
		pUnhookWindowsHookEx.Call(hookMouse)
	}
	if mainHWND != 0 {
		pDestroyWindow.Call(mainHWND)
	}
	if hostHWND != 0 {
		pDestroyWindow.Call(hostHWND)
	}
	pPostQuitMessage.Call(0)
}

func msgBox(text, title string) {
	pMessageBoxW.Call(0, uintptr(unsafe.Pointer(utf16p(text))), uintptr(unsafe.Pointer(utf16p(title))), 0x10)
}

// breakWatcher raises a gentle tray reminder after a long stretch of continuous
// activity. A gap of five minutes without input counts as a break.
func breakWatcher() {
	var workStart time.Time
	var reminded bool
	for range time.Tick(20 * time.Second) {
		storeMu.RLock()
		mins := store.Settings.BreakMinutes
		storeMu.RUnlock()
		last := time.Unix(0, lastEvent.Load())
		if time.Since(last) > 5*time.Minute || last.IsZero() {
			workStart, reminded = time.Time{}, false
			continue
		}
		if workStart.IsZero() {
			workStart = last
		}
		if mins > 0 && !reminded && time.Since(workStart) >= time.Duration(mins)*time.Minute {
			reminded = true
			trayNotify("Time for a short break", fmt.Sprintf("You have been active for about %d minutes. Stretch, breathe, and rest your eyes.", mins))
		}
		if mins > 0 && reminded && time.Since(workStart) >= time.Duration(mins*2)*time.Minute {
			reminded = false
			workStart = time.Now().Add(-time.Duration(mins) * time.Minute)
		}
	}
}

func main() {
	runtime.LockOSThread()
	for _, a := range os.Args[1:] {
		if a == "--background" {
			startHidden = true
		}
	}
	// Only one instance may count input, otherwise every key would be counted twice.
	name := utf16p(`Local\KeyClickTrackerSingleton`)
	pCreateMutexW.Call(0, 0, uintptr(unsafe.Pointer(name)))
	if e, _, _ := pGetLastError.Call(); e == 183 { // ERROR_ALREADY_EXISTS
		if h, _, _ := pFindWindowW.Call(uintptr(unsafe.Pointer(utf16p("KeyClickTrackerHost"))), 0); h != 0 {
			pPostMessageW.Call(h, wmOpen, 0, 0)
		}
		return
	}

	loadStore()
	logLine(appName + " " + appVersion + " starting")
	storeMu.RLock()
	hide := startHidden
	storeMu.RUnlock()
	instance, _, _ := pGetModuleHandleW.Call(0)
	appInstance = instance
	logLine(fmt.Sprintf("icon resource handles: 16px=%t 32px=%t", loadIcon(16) != 0, loadIcon(32) != 0))
	if err := createHostWindow(instance); err != nil {
		logLine(err.Error())
		msgBox(err.Error(), appName+" startup error")
		return
	}
	onExitRequest = func() { pPostMessageW.Call(hostHWND, wmExit, 0, 0) }
	addTrayIcon()
	keyboardCallback = syscall.NewCallback(func(n, w, l uintptr) uintptr { return keyboardProc(int(n), w, l) })
	mouseCallback = syscall.NewCallback(func(n, w, l uintptr) uintptr { return mouseProc(int(n), w, l) })
	hookKeyboard, _, _ = pSetWindowsHookExW.Call(whKeyboardLL, keyboardCallback, instance, 0)
	hookMouse, _, _ = pSetWindowsHookExW.Call(whMouseLL, mouseCallback, instance, 0)
	if !hooksOK() {
		e, _, _ := pGetLastError.Call()
		logLine(fmt.Sprintf("Input hook setup warning: keyboard=%t mouse=%t error=%d", hookKeyboard != 0, hookMouse != 0, e))
	}
	ln, err := startServer()
	if err != nil {
		logLine("HTTP server failed: " + err.Error())
		msgBox(err.Error(), appName+" server error")
		shutdown()
		return
	}
	serverURL = "http://" + ln.Addr().String()
	url := serverURL + "/?token=" + token
	logLine("Local server listening at " + serverURL)
	if os.Getenv("KEYCLICK_DEV") == "1" { // test hook: lets automated UI tests find the page
		_ = os.WriteFile(filepath.Join(dataDir, "devurl.txt"), []byte(url), 0600)
	}

	go func() {
		for range time.Tick(5 * time.Second) {
			if dirty.Swap(false) {
				if e := saveStore(); e != nil {
					logLine("save failed: " + e.Error())
					dirty.Store(true)
				}
			}
		}
	}()
	go breakWatcher()

	view = webview2.NewWithOptions(webview2.WebViewOptions{
		Debug:         os.Getenv("KEYCLICK_DEV") == "1",
		AutoFocus:     true,
		DataPath:      filepath.Join(dataDir, "WebViewProfile"),
		WindowOptions: webview2.WindowOptions{Title: appName, Width: 1280, Height: 820, IconId: iconResourceID, Center: true},
	})
	if view == nil {
		logLine("WebView2 runtime unavailable; opening the default browser instead")
		pShellExecuteW.Call(0, uintptr(unsafe.Pointer(utf16p("open"))), uintptr(unsafe.Pointer(utf16p(url))), 0, 0, swNormal)
		var m winMsg
		for {
			r, _, _ := pGetMessageW.Call(uintptr(unsafe.Pointer(&m)), 0, 0, 0)
			if int32(r) <= 0 {
				break
			}
			pTranslateMessage.Call(uintptr(unsafe.Pointer(&m)))
			pDispatchMessageW.Call(uintptr(unsafe.Pointer(&m)))
		}
	} else {
		mainHWND = uintptr(view.Window())
		frameless(mainHWND)
		pShowWindow.Call(mainHWND, swHide) // stay hidden until the page reports it has painted (no white flash)
		bindWindowControls()
		var shown atomic.Bool
		reveal := func() {
			if hide || !shown.CompareAndSwap(false, true) {
				return
			}
			pShowWindow.Call(mainHWND, swShow)
			pSetForegroundWindow.Call(mainHWND)
		}
		_ = view.Bind("kcReady", func() { reveal() })
		onSettingsChanged = func() { view.Dispatch(syncOverlay) }
		view.Dispatch(syncOverlay) // show the live overlay at start-up if it was left enabled
		view.Init("window.__KC_NATIVE = true;")
		view.Navigate(url)
		go func() { time.Sleep(6 * time.Second); view.Dispatch(reveal) }() // safety net if the page never signals
		view.Run()
		view.Destroy()
	}
	if hookKeyboard != 0 {
		pUnhookWindowsHookEx.Call(hookKeyboard)
	}
	if hookMouse != 0 {
		pUnhookWindowsHookEx.Call(hookMouse)
	}
	flushForExit()
	logLine(appName + " exited cleanly")
}
