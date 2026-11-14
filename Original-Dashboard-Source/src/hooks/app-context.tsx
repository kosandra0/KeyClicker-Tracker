"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { StatusResponse } from "@/lib/types";

export function usePref<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s !== null) setV(JSON.parse(s) as T);
    } catch {
      /* ignore */
    }
  }, [key]);
  const set = useCallback(
    (n: T) => {
      setV(n);
      try {
        localStorage.setItem(key, JSON.stringify(n));
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [v, set];
}

type Theme = "light" | "dark" | "system";
type MotionPref = "system" | "full" | "reduced";
type Radius = "round" | "compact";
type ToastKind = "success" | "error" | "info";

interface Ctx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  motionPref: MotionPref;
  setMotionPref: (m: MotionPref) => void;
  radius: Radius;
  setRadius: (r: Radius) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  captureEnabled: boolean;
  setCaptureEnabled: (c: boolean) => void;
  status: StatusResponse | null;
  refreshStatus: () => Promise<void>;
  setPaused: (p: boolean) => Promise<void>;
  toast: (msg: string, kind?: ToastKind) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}

const HOUR = 3600_000;
const KEY_RE = /^[A-Za-z0-9]{1,32}$/;
const MOUSE_BTN = ["left", "middle", "right", "x1", "x2"];

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePref<Theme>("ks_theme", "system");
  const [motionPref, setMotionPref] = usePref<MotionPref>("ks_motion", "system");
  const [radius, setRadius] = usePref<Radius>("ks_radius", "round");
  const [collapsed, setCollapsed] = usePref<boolean>("ks_collapsed", false);
  const [captureEnabled, setCaptureEnabled] = usePref<boolean>("ks_browser_capture", false);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; kind: ToastKind }[]>([]);
  const toastId = useRef(0);

  // theme application
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-radius", radius);
  }, [radius]);

  const toast = useCallback((msg: string, kind: ToastKind = "info") => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      if (r.ok) setStatus(await r.json());
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const iv = setInterval(refreshStatus, 5000);
    return () => clearInterval(iv);
  }, [refreshStatus]);

  const setPaused = useCallback(
    async (paused: boolean) => {
      const r = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused }),
      });
      if (r.ok) {
        toast(paused ? "Monitoring paused" : "Monitoring resumed", "info");
        await refreshStatus();
      } else toast("Could not change monitoring state", "error");
    },
    [refreshStatus, toast],
  );

  // ---- optional in-page capture (counts only while this tab is focused) ----
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = status?.paused ?? false;
  }, [status?.paused]);

  useEffect(() => {
    if (!captureEnabled) return;
    const buf = new Map<string, { ts: number; kind: string; id: string; count: number; amount: number }>();
    const add = (kind: string, id: string, amount = 0) => {
      if (pausedRef.current) return;
      const bucket = Math.floor(Date.now() / HOUR) * HOUR;
      const k = `${bucket}|${kind}|${id}`;
      const cur = buf.get(k);
      if (cur) {
        cur.count += 1;
        cur.amount += amount;
      } else buf.set(k, { ts: bucket + 1, kind, id, count: 1, amount });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !e.isTrusted) return;
      add("key", KEY_RE.test(e.code) ? e.code : "Unknown");
    };
    const onDown = (e: MouseEvent) => {
      if (!e.isTrusted) return;
      const id = MOUSE_BTN[e.button];
      if (id) add("mouse", id);
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.isTrusted) return;
      const mul = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1;
      if (e.deltaY !== 0) add("scroll", e.deltaY < 0 ? "up" : "down", Math.round(Math.abs(e.deltaY) * mul * 1.2));
      if (e.deltaX !== 0) add("scroll", e.deltaX < 0 ? "left" : "right", Math.round(Math.abs(e.deltaX) * mul * 1.2));
    };
    const flush = (beacon = false) => {
      if (buf.size === 0) return;
      const deltas = [...buf.values()];
      buf.clear();
      const body = JSON.stringify({ source: "browser", deltas });
      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon("/api/ingest", new Blob([body], { type: "application/json" }));
        return;
      }
      fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // re-queue on failure so counts are not lost
        for (const d of deltas) {
          const k = `${d.ts}|${d.kind}|${d.id}`;
          const cur = buf.get(k);
          if (cur) {
            cur.count += d.count;
            cur.amount += d.amount;
          } else buf.set(k, d);
        }
      });
    };
    const iv = setInterval(() => flush(), 4000);
    const onHide = () => flush(true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(iv);
      flush(true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [captureEnabled]);

  const value = useMemo<Ctx>(
    () => ({
      theme, setTheme, motionPref, setMotionPref, radius, setRadius, collapsed, setCollapsed,
      captureEnabled, setCaptureEnabled, status, refreshStatus, setPaused, toast,
    }),
    [theme, setTheme, motionPref, setMotionPref, radius, setRadius, collapsed, setCollapsed, captureEnabled, setCaptureEnabled, status, refreshStatus, setPaused, toast],
  );

  return (
    <AppCtx.Provider value={value}>
      <MotionConfig reducedMotion={motionPref === "reduced" ? "always" : motionPref === "full" ? "never" : "user"}>
        {children}
        <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24 }}
                className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-line bg-card px-4 py-3 text-sm shadow-lg shadow-black/10"
              >
                {t.kind === "success" ? (
                  <CheckCircle2 size={16} className="text-good" />
                ) : t.kind === "error" ? (
                  <AlertTriangle size={16} className="text-warn" />
                ) : (
                  <Info size={16} className="text-accent" />
                )}
                {t.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </AppCtx.Provider>
  );
}
