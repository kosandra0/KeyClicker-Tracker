//! KeyScope native agent (Windows).
//!
//! * Installs WH_KEYBOARD_LL and WH_MOUSE_LL hooks on the main thread.
//! * Hook callbacks only update an in-memory aggregate (no I/O, no allocation
//!   beyond a short identifier string).
//! * A background thread posts batched hourly deltas to `<KEYSCOPE_URL>/api/ingest`.
//! * Only key identifiers (KeyboardEvent.code vocabulary), mouse-button ids,
//!   scroll direction/amount and counts are kept. Never characters or sequences.
//! * Runs in a visible console window. Ctrl+C / closing the window stops it.
//!
//! NOTE: this crate was written without access to a Windows toolchain and has
//! NOT been compiled or tested. Treat it as unverified source.

#[cfg(not(windows))]
fn main() {
    eprintln!("keyscope-agent only runs on Windows 10/11.");
    std::process::exit(1);
}

#[cfg(windows)]
mod win {
    use std::collections::{HashMap, HashSet};
    use std::sync::atomic::{AtomicBool, AtomicIsize, Ordering};
    use std::sync::{Mutex, OnceLock};
    use std::time::{Duration, SystemTime, UNIX_EPOCH};

    use windows_sys::Win32::Foundation::{LPARAM, LRESULT, WPARAM};
    use windows_sys::Win32::System::Console::SetConsoleCtrlHandler;
    use windows_sys::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, DispatchMessageW, GetMessageW, SetWindowsHookExW, TranslateMessage,
        UnhookWindowsHookEx, KBDLLHOOKSTRUCT, MSG, MSLLHOOKSTRUCT,
    };

    const WH_KEYBOARD_LL: i32 = 13;
    const WH_MOUSE_LL: i32 = 14;
    const HC_ACTION: i32 = 0;
    const WM_KEYDOWN: u32 = 0x0100;
    const WM_KEYUP: u32 = 0x0101;
    const WM_SYSKEYDOWN: u32 = 0x0104;
    const WM_SYSKEYUP: u32 = 0x0105;
    const WM_LBUTTONDOWN: u32 = 0x0201;
    const WM_RBUTTONDOWN: u32 = 0x0204;
    const WM_MBUTTONDOWN: u32 = 0x0207;
    const WM_MOUSEWHEEL: u32 = 0x020A;
    const WM_XBUTTONDOWN: u32 = 0x020B;
    const WM_MOUSEHWHEEL: u32 = 0x020E;
    const LLKHF_EXTENDED: u32 = 0x01;
    const LLKHF_INJECTED: u32 = 0x10;
    const LLMHF_INJECTED: u32 = 0x01;
    const HOUR_MS: u64 = 3_600_000;

    type Key = (u64, &'static str, String); // (hour bucket ms, kind, id)

    #[derive(Default)]
    struct State {
        counts: HashMap<Key, (u64, u64)>, // (count, amount)
        down: HashSet<String>,            // keys currently held (autorepeat filter)
    }

    static STATE: OnceLock<Mutex<State>> = OnceLock::new();
    static PAUSED: AtomicBool = AtomicBool::new(false);
    static COUNT_INJECTED: AtomicBool = AtomicBool::new(false);
    static KB_HOOK: AtomicIsize = AtomicIsize::new(0);
    static MS_HOOK: AtomicIsize = AtomicIsize::new(0);
    static BASE_URL: OnceLock<String> = OnceLock::new();

    fn state() -> &'static Mutex<State> {
        STATE.get_or_init(|| Mutex::new(State::default()))
    }

    fn now_ms() -> u64 {
        SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
    }

    fn add(kind: &'static str, id: String, amount: u64) {
        if PAUSED.load(Ordering::Relaxed) {
            return;
        }
        let bucket = now_ms() / HOUR_MS * HOUR_MS;
        if let Ok(mut s) = state().lock() {
            let e = s.counts.entry((bucket, kind, id)).or_insert((0, 0));
            e.0 += 1;
            e.1 += amount;
        }
    }

    // Scan-code (set 1, non-extended) -> KeyboardEvent.code style identifier.
    const BASE: &[&str] = &[
        // 0x00 - 0x0F
        "", "Escape", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6",
        "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal", "Backspace", "Tab",
        // 0x10 - 0x1F
        "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI",
        "KeyO", "KeyP", "BracketLeft", "BracketRight", "Enter", "ControlLeft", "KeyA", "KeyS",
        // 0x20 - 0x2F
        "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon",
        "Quote", "Backquote", "ShiftLeft", "Backslash", "KeyZ", "KeyX", "KeyC", "KeyV",
        // 0x30 - 0x3F
        "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight", "NumpadMultiply",
        "AltLeft", "Space", "CapsLock", "F1", "F2", "F3", "F4", "F5",
        // 0x40 - 0x4F
        "F6", "F7", "F8", "F9", "F10", "NumLock", "ScrollLock", "Numpad7",
        "Numpad8", "Numpad9", "NumpadSubtract", "Numpad4", "Numpad5", "Numpad6", "NumpadAdd", "Numpad1",
        // 0x50 - 0x58
        "Numpad2", "Numpad3", "Numpad0", "NumpadDecimal", "", "", "IntlBackslash", "F11",
        "F12",
    ];

    /// Returns None for events that must be ignored (fake shifts).
    fn key_id(vk: u32, scan: u32, ext: bool) -> Option<String> {
        // Fake Shift injected by Windows around navigation keys when NumLock is on.
        if (scan == 0x2A || scan == 0x36) && ext {
            return None;
        }
        if vk == 0x13 {
            return Some("Pause".into());
        }
        if vk == 0x2C {
            return Some("PrintScreen".into());
        }
        if (0x7C..=0x87).contains(&vk) {
            return Some(format!("F{}", vk - 0x7C + 13));
        }
        let name = if ext {
            match scan {
                0x1C => "NumpadEnter",
                0x1D => "ControlRight",
                0x35 => "NumpadDivide",
                0x37 => "PrintScreen",
                0x38 => "AltRight",
                0x45 => "NumLock",
                0x47 => "Home",
                0x48 => "ArrowUp",
                0x49 => "PageUp",
                0x4B => "ArrowLeft",
                0x4D => "ArrowRight",
                0x4F => "End",
                0x50 => "ArrowDown",
                0x51 => "PageDown",
                0x52 => "Insert",
                0x53 => "Delete",
                0x5B => "MetaLeft",
                0x5C => "MetaRight",
                0x5D => "ContextMenu",
                _ => "",
            }
        } else {
            match scan {
                0x5B => "MetaLeft",
                0x5C => "MetaRight",
                0x64..=0x6E => return Some(format!("F{}", scan - 0x64 + 13)),
                0x76 => "F24",
                _ => BASE.get(scan as usize).copied().unwrap_or(""),
            }
        };
        if name.is_empty() {
            Some(format!("VK_{:X}", vk))
        } else {
            Some(name.to_string())
        }
    }

    fn on_key(msg: u32, vk: u32, scan: u32, flags: u32) {
        if flags & LLKHF_INJECTED != 0 && !COUNT_INJECTED.load(Ordering::Relaxed) {
            return;
        }
        let ext = flags & LLKHF_EXTENDED != 0;
        let Some(id) = key_id(vk, scan, ext) else { return };
        let Ok(mut s) = state().lock() else { return };
        match msg {
            WM_KEYDOWN | WM_SYSKEYDOWN => {
                // insert() == false -> key already held -> autorepeat, do not count.
                if s.down.insert(id.clone()) {
                    drop(s);
                    add("key", id, 0);
                }
            }
            WM_KEYUP | WM_SYSKEYUP => {
                s.down.remove(&id);
            }
            _ => {}
        }
    }

    fn on_mouse(msg: u32, data: u32, flags: u32) {
        if flags & LLMHF_INJECTED != 0 && !COUNT_INJECTED.load(Ordering::Relaxed) {
            return;
        }
        let hi = (data >> 16) & 0xFFFF;
        let delta = (hi as u16 as i16) as i32;
        match msg {
            WM_LBUTTONDOWN => add("mouse", "left".into(), 0),
            WM_RBUTTONDOWN => add("mouse", "right".into(), 0),
            WM_MBUTTONDOWN => add("mouse", "middle".into(), 0),
            WM_XBUTTONDOWN => match hi {
                1 => add("mouse", "x1".into(), 0),
                2 => add("mouse", "x2".into(), 0),
                _ => {}
            },
            WM_MOUSEWHEEL if delta != 0 => {
                add("scroll", if delta > 0 { "up" } else { "down" }.into(), delta.unsigned_abs() as u64)
            }
            WM_MOUSEHWHEEL if delta != 0 => {
                add("scroll", if delta > 0 { "right" } else { "left" }.into(), delta.unsigned_abs() as u64)
            }
            _ => {}
        }
    }

    unsafe extern "system" fn kb_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code == HC_ACTION {
            let k = &*(lparam as *const KBDLLHOOKSTRUCT);
            on_key(wparam as u32, k.vkCode, k.scanCode, k.flags as u32);
        }
        CallNextHookEx(KB_HOOK.load(Ordering::Relaxed), code, wparam, lparam)
    }

    unsafe extern "system" fn ms_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code == HC_ACTION {
            let m = &*(lparam as *const MSLLHOOKSTRUCT);
            on_mouse(wparam as u32, m.mouseData as u32, m.flags as u32);
        }
        CallNextHookEx(MS_HOOK.load(Ordering::Relaxed), code, wparam, lparam)
    }

    fn drain() -> HashMap<Key, (u64, u64)> {
        state().lock().map(|mut s| std::mem::take(&mut s.counts)).unwrap_or_default()
    }

    fn requeue(batch: HashMap<Key, (u64, u64)>) {
        if let Ok(mut s) = state().lock() {
            for (k, v) in batch {
                let e = s.counts.entry(k).or_insert((0, 0));
                e.0 += v.0;
                e.1 += v.1;
            }
        }
    }

    /// Posts the pending batch. An empty batch still acts as a heartbeat.
    fn flush() {
        let batch = drain();
        let deltas: Vec<serde_json::Value> = batch
            .iter()
            .map(|((bucket, kind, id), (count, amount))| {
                serde_json::json!({ "ts": bucket, "kind": kind, "id": id, "count": count, "amount": amount })
            })
            .collect();
        let body = serde_json::json!({ "source": "native", "version": env!("CARGO_PKG_VERSION"), "deltas": deltas });
        let url = format!("{}/api/ingest", BASE_URL.get().map(String::as_str).unwrap_or("http://127.0.0.1:3000"));
        match ureq::post(&url).timeout(Duration::from_secs(5)).send_json(body) {
            Ok(resp) => {
                if let Ok(v) = resp.into_json::<serde_json::Value>() {
                    let paused = v.get("paused").and_then(|p| p.as_bool()).unwrap_or(false);
                    let was = PAUSED.swap(paused, Ordering::Relaxed);
                    if paused != was {
                        eprintln!("[keyscope] monitoring {}", if paused { "PAUSED" } else { "RESUMED" });
                    }
                }
            }
            Err(e) => {
                eprintln!("[keyscope] server unreachable ({e}); keeping counts in memory");
                requeue(batch);
            }
        }
    }

    unsafe extern "system" fn ctrl_handler(_: u32) -> i32 {
        flush();
        UnhookWindowsHookEx(KB_HOOK.load(Ordering::Relaxed));
        UnhookWindowsHookEx(MS_HOOK.load(Ordering::Relaxed));
        std::process::exit(0);
    }

    pub fn run() {
        let base = std::env::var("KEYSCOPE_URL").unwrap_or_else(|_| "http://127.0.0.1:3000".into());
        let _ = BASE_URL.set(base.trim_end_matches('/').to_string());
        if std::env::var("KEYSCOPE_COUNT_INJECTED").map(|v| v == "1").unwrap_or(false) {
            COUNT_INJECTED.store(true, Ordering::Relaxed);
        }

        println!("KeyScope agent {} — MONITORING IS ACTIVE", env!("CARGO_PKG_VERSION"));
        println!("Counting key identifiers, mouse buttons and scroll events. Typed text is never stored.");
        println!("Sending aggregates to {}. Press Ctrl+C or close this window to stop.", BASE_URL.get().unwrap());

        unsafe {
            SetConsoleCtrlHandler(Some(ctrl_handler), 1);
            let hmod = GetModuleHandleW(std::ptr::null());
            let kb = SetWindowsHookExW(WH_KEYBOARD_LL, Some(kb_proc), hmod, 0);
            let ms = SetWindowsHookExW(WH_MOUSE_LL, Some(ms_proc), hmod, 0);
            if kb == 0 || ms == 0 {
                eprintln!("Failed to install input hooks.");
                std::process::exit(2);
            }
            KB_HOOK.store(kb, Ordering::Relaxed);
            MS_HOOK.store(ms, Ordering::Relaxed);
        }

        std::thread::spawn(|| loop {
            std::thread::sleep(Duration::from_secs(5));
            flush();
        });

        unsafe {
            let mut msg: MSG = std::mem::zeroed();
            while GetMessageW(&mut msg, 0, 0, 0) > 0 {
                TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }
        flush();
    }
}

#[cfg(windows)]
fn main() {
    win::run();
}
