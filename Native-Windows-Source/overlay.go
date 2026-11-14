//go:build windows

package main

import (
	"path/filepath"
	"sync/atomic"
	"syscall"
	"time"
	"unsafe"

	"github.com/jchv/go-webview2"
)

// The live overlay is a small, always-on-top, frameless, semi-transparent window
// that shows the current WPM / CPM. It is a second WebView2 window owned by this
// process, so it keeps working while the main window is hidden in the tray.

var (
	pSetLayered = user32.NewProc("SetLayeredWindowAttributes")

	ovView     webview2.WebView
	ovHWND     uintptr
	ovOldProc  uintptr
	ovCallback uintptr
	ovAlpha    atomic.Int32
	ovGen      atomic.Int32
	ovWatching atomic.Bool
)

const (
	ovIdleAlpha  = 175 // a little see-through while the pointer is elsewhere
	ovHoverAlpha = 255
	wsPopup      = 0x80000000
	wsExTopmost  = 0x00000008
	wsExTool     = 0x00000080
	wsExLayered  = 0x00080000
	wsExNoActive = 0x08000000
	gwlExStyle   = -20
	lwaAlpha     = 2
	swpNoActive  = 0x10
)

func setOverlayAlpha(a int32) {
	ovAlpha.Store(a)
	if ovHWND != 0 {
		pSetLayered.Call(ovHWND, 0, uintptr(a), lwaAlpha)
	}
}

// fadeOverlay animates the window opacity so hover feels like a soft glow, not a jump.
func fadeOverlay(target int32) {
	gen := ovGen.Add(1)
	go func() {
		from := ovAlpha.Load()
		const steps = 9
		for i := 1; i <= steps; i++ {
			if ovGen.Load() != gen {
				return
			}
			setOverlayAlpha(from + (target-from)*int32(i)/steps)
			time.Sleep(16 * time.Millisecond)
		}
	}()
}

func overlayRegion(h uintptr) {
	var r rect
	pGetWindowRect.Call(h, uintptr(unsafe.Pointer(&r)))
	d := 2 * 18 * dpiOf(h) / 96
	rgn, _, _ := pCreateRoundRectRgn.Call(0, 0, uintptr(r.Right-r.Left+1), uintptr(r.Bottom-r.Top+1), uintptr(d), uintptr(d))
	pSetWindowRgn.Call(h, rgn, 1)
}

func overlayProc(h, msg, wp, lp uintptr) uintptr {
	switch uint32(msg) {
	case wmNCCalcSize:
		if wp != 0 {
			return 0
		}
	case wmGetMinMax:
		mm := (*minMaxInfo)(unsafe.Pointer(lp))
		s := int32(dpiOf(h))
		mm.MinTrack = point{X: 150 * s / 96, Y: 56 * s / 96}
		mm.MaxTrack = point{X: 900 * s / 96, Y: 500 * s / 96}
	case wmClose:
		hideOverlay(true)
		return 0
	case wmSize:
		r, _, _ := pCallWindowProcW.Call(ovOldProc, h, msg, wp, lp)
		overlayRegion(h)
		return r
	}
	r, _, _ := pCallWindowProcW.Call(ovOldProc, h, msg, wp, lp)
	return r
}

func hideOverlay(persist bool) {
	if ovHWND != 0 {
		pShowWindow.Call(ovHWND, swHide)
	}
	if persist {
		storeMu.Lock()
		store.Settings.OverlayOn = false
		storeMu.Unlock()
		dirty.Store(true)
		_ = saveStore()
		jsEval("window.KC&&KC.overlayClosed&&KC.overlayClosed()") // keep the Settings switch in step
	}
}

// syncOverlay shows or hides the overlay to match the saved setting. UI thread only.
func syncOverlay() {
	storeMu.RLock()
	on := store.Settings.OverlayOn
	storeMu.RUnlock()
	if !on {
		if ovHWND != 0 {
			hideOverlay(false)
		}
		return
	}
	if ovHWND == 0 {
		createOverlay()
		return
	}
	pShowWindow.Call(ovHWND, 8) // SW_SHOWNA: show without taking focus
}

func createOverlay() {
	storeMu.RLock()
	st := *store.Settings
	storeMu.RUnlock()
	v := webview2.NewWithOptions(webview2.WebViewOptions{
		DataPath:      filepath.Join(dataDir, "WebViewProfile"),
		WindowOptions: webview2.WindowOptions{Title: appName + " Live", Width: uint(st.OverlayW), Height: uint(st.OverlayH), IconId: iconResourceID},
	})
	if v == nil {
		logLine("overlay: WebView2 window could not be created")
		return
	}
	ovView = v
	ovHWND = uintptr(v.Window())
	pSetWindowLongPtrW.Call(ovHWND, ^uintptr(-gwlStyle-1), uintptr(wsPopup|wsThickFrame|wsClipChildren))
	pSetWindowLongPtrW.Call(ovHWND, ^uintptr(-gwlExStyle-1), uintptr(wsExTopmost|wsExTool|wsExLayered|wsExNoActive))
	ovCallback = syscall.NewCallback(overlayProc)
	ovOldProc, _, _ = pSetWindowLongPtrW.Call(ovHWND, ^uintptr(-gwlpWndProc-1), ovCallback)
	setOverlayAlpha(ovIdleAlpha)

	dpi := dpiOf(ovHWND)
	w, h := st.OverlayW*dpi/96, st.OverlayH*dpi/96
	vx, _, _ := pGetSystemMetrics.Call(76)
	vy, _, _ := pGetSystemMetrics.Call(77)
	vw, _, _ := pGetSystemMetrics.Call(78)
	vh, _, _ := pGetSystemMetrics.Call(79)
	x, y := int(int32(vx))+int(vw)-w-24*dpi/96, int(int32(vy))+60*dpi/96 // first run: top-right corner
	if st.OverlaySet {
		x, y = st.OverlayX, st.OverlayY
	}
	// keep it on a screen that still exists (monitors can change between runs)
	if x < int(int32(vx))-w+40 || x > int(int32(vx))+int(vw)-40 || y < int(int32(vy)) || y > int(int32(vy))+int(vh)-40 {
		x, y = int(int32(vx))+int(vw)-w-24*dpi/96, int(int32(vy))+60*dpi/96
	}
	pSetWindowPos.Call(ovHWND, ^uintptr(0), uintptr(x), uintptr(y), uintptr(w), uintptr(h), swpFrameChanged|swpNoActive|swpShowWindow)
	overlayRegion(ovHWND)

	_ = v.Bind("kcOvDrag", func() {
		pReleaseCapture.Call()
		pPostMessageW.Call(ovHWND, wmNCLButton, 2, 0)
	})
	_ = v.Bind("kcOvResize", func() {
		pReleaseCapture.Call()
		pPostMessageW.Call(ovHWND, wmNCLButton, 17, 0) // HTBOTTOMRIGHT
	})
	_ = v.Bind("kcOvClose", func() { pPostMessageW.Call(ovHWND, wmClose, 0, 0) })
	_ = v.Bind("kcOvHover", func(on bool) {
		if on {
			fadeOverlay(ovHoverAlpha)
		} else {
			fadeOverlay(ovIdleAlpha)
		}
	})
	v.Navigate(serverURL + "/ui/overlay.html?token=" + token)
	logLine("overlay window created")

	if ovWatching.CompareAndSwap(false, true) {
		go watchOverlayRect()
	}
}

// watchOverlayRect remembers where the user dropped and how big they made the overlay.
func watchOverlayRect() {
	var last rect
	for range time.Tick(1500 * time.Millisecond) {
		if ovHWND == 0 {
			continue
		}
		if vis, _, _ := pIsWindowVisible.Call(ovHWND); vis == 0 {
			continue
		}
		var r rect
		pGetWindowRect.Call(ovHWND, uintptr(unsafe.Pointer(&r)))
		if r == last || r.Right <= r.Left {
			continue
		}
		last = r
		dpi := dpiOf(ovHWND)
		storeMu.Lock()
		s := store.Settings
		s.OverlayX, s.OverlayY, s.OverlaySet = int(r.Left), int(r.Top), true
		s.OverlayW, s.OverlayH = int(r.Right-r.Left)*96/dpi, int(r.Bottom-r.Top)*96/dpi
		storeMu.Unlock()
		dirty.Store(true)
	}
}
