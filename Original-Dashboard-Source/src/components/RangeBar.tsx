"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { useRange } from "@/hooks/range-context";
import { RANGE_OPTIONS, UNITS, UNIT_LABELS } from "@/lib/ranges";

export function RangeBar({ showUnit = true }: { showUnit?: boolean }) {
  const { rangeId, setRangeId, custom, setCustom, unit, setUnit, resolved } = useRange();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2 text-sm font-medium shadow-sm transition hover:bg-key"
        >
          <CalendarRange size={15} className="text-accent" />
          {resolved.label}
          <ChevronDown size={14} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-40 mt-2 w-64 origin-top-right rounded-2xl border border-line bg-card p-1.5 shadow-xl shadow-black/10"
            >
              <div role="listbox" className="max-h-80 overflow-auto">
                {RANGE_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    role="option"
                    aria-selected={rangeId === o.id}
                    onClick={() => {
                      setRangeId(o.id);
                      if (o.id !== "custom") setOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-key"
                  >
                    {o.label}
                    {rangeId === o.id && <Check size={14} className="text-accent" />}
                  </button>
                ))}
              </div>
              {rangeId === "custom" && (
                <div className="mt-1 space-y-2 border-t border-line p-3">
                  <label className="block text-xs text-muted">
                    Start date
                    <input
                      type="date"
                      value={custom.start}
                      max={custom.end}
                      onChange={(e) => e.target.value && setCustom({ ...custom, start: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink"
                    />
                  </label>
                  <label className="block text-xs text-muted">
                    End date (inclusive)
                    <input
                      type="date"
                      value={custom.end}
                      min={custom.start}
                      onChange={(e) => e.target.value && setCustom({ ...custom, end: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-line bg-bg px-2 py-1.5 text-sm text-ink"
                    />
                  </label>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {showUnit && (
        <select
          aria-label="Aggregation"
          value={unit}
          onChange={(e) => setUnit(e.target.value as (typeof UNITS)[number])}
          className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-medium shadow-sm"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABELS[u]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
