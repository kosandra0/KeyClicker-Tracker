"use client";

import { useMemo } from "react";
import { keyLabel } from "@/lib/keys";
import type { CountRow } from "@/lib/types";

// ANSI full-size layout. Token: string = 1u key, number = gap, [code, w, h?].
// Layouts are data, so other physical layouts (ISO/JIS) can be added later.
type Tok = string | number | [string, number, number?];

const L = (a: string, b: string) => {
  const out: string[] = [];
  for (let c = a.charCodeAt(0); c <= b.charCodeAt(0); c++) out.push("Key" + String.fromCharCode(c));
  return out;
};
const row = (letters: string[]) => letters;

export const ANSI_LAYOUT: Tok[][] = [
  ["Escape", 1, "F1", "F2", "F3", "F4", 0.5, "F5", "F6", "F7", "F8", 0.5, "F9", "F10", "F11", "F12", 0.25, "PrintScreen", "ScrollLock", "Pause"],
  [
    "Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal",
    ["Backspace", 2], 0.25, "Insert", "Home", "PageUp", 0.25, "NumLock", "NumpadDivide", "NumpadMultiply", "NumpadSubtract",
  ],
  [
    ["Tab", 1.5], ...row(["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP"]), "BracketLeft", "BracketRight",
    ["Backslash", 1.5], 0.25, "Delete", "End", "PageDown", 0.25, "Numpad7", "Numpad8", "Numpad9", ["NumpadAdd", 1, 2],
  ],
  [
    ["CapsLock", 1.75], ...row([...L("A", "A"), "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL"]), "Semicolon", "Quote",
    ["Enter", 2.25], 3.5, "Numpad4", "Numpad5", "Numpad6",
  ],
  [
    ["ShiftLeft", 2.25], "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash", ["ShiftRight", 2.75], 0.25, 1,
    "ArrowUp", 1, 0.25, "Numpad1", "Numpad2", "Numpad3", ["NumpadEnter", 1, 2],
  ],
  [
    ["ControlLeft", 1.25], ["MetaLeft", 1.25], ["AltLeft", 1.25], ["Space", 6.25], ["AltRight", 1.25], ["MetaRight", 1.25],
    ["ContextMenu", 1.25], ["ControlRight", 1.25], 0.25, "ArrowLeft", "ArrowDown", "ArrowRight", 0.25, ["Numpad0", 2], "NumpadDecimal",
  ],
];

interface PlacedKey {
  code: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function place(layout: Tok[][]) {
  const keys: PlacedKey[] = [];
  let width = 0;
  layout.forEach((r, i) => {
    const y = i === 0 ? 0 : 1.5 + (i - 1);
    let x = 0;
    for (const t of r) {
      if (typeof t === "number") x += t;
      else {
        const [code, w, h] = typeof t === "string" ? [t, 1, 1] : [t[0], t[1], t[2] ?? 1];
        keys.push({ code, x, y, w, h });
        x += w;
      }
    }
    width = Math.max(width, x);
  });
  return { keys, width, height: 1.5 + (layout.length - 1) };
}

const SHORT: Record<string, string> = {
  Escape: "Esc", PrintScreen: "PrtSc", ScrollLock: "ScrLk", Pause: "Pause", Insert: "Ins", Delete: "Del", PageUp: "PgUp", PageDown: "PgDn",
  Home: "Home", End: "End", NumLock: "Num", NumpadDivide: "/", NumpadMultiply: "*", NumpadSubtract: "−", NumpadAdd: "+", NumpadEnter: "Ent",
  NumpadDecimal: ".", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", MetaLeft: "Win", MetaRight: "Win", ContextMenu: "Menu",
  ControlLeft: "Ctrl", ControlRight: "Ctrl", AltLeft: "Alt", AltRight: "Alt", ShiftLeft: "Shift", ShiftRight: "Shift", CapsLock: "Caps",
  Backspace: "Backspace", Enter: "Enter", Tab: "Tab", Space: "",
  Backquote: "`", Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]", Backslash: "\\", Semicolon: ";", Quote: "'", Comma: ",", Period: ".", Slash: "/",
};

function shortLabel(code: string): string {
  if (code in SHORT) return SHORT[code];
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code) || /^Numpad\d$/.test(code)) return code.slice(-1);
  return keyLabel(code);
}

export function KeyboardViz({
  keys,
  onSelect,
}: {
  keys: CountRow[];
  onSelect: (code: string) => void;
}) {
  const { keys: placed, width, height } = useMemo(() => place(ANSI_LAYOUT), []);
  const counts = useMemo(() => new Map(keys.map((k) => [k.id, k.count])), [keys]);
  const max = Math.max(1, ...keys.map((k) => k.count));
  const total = keys.reduce((s, k) => s + k.count, 0);

  return (
    <div className="overflow-x-auto">
      <div
        className="relative mx-auto min-w-[640px] rounded-[var(--radius)] border border-line bg-side p-3"
        style={{ containerType: "inline-size" }}
      >
        <div className="relative w-full" style={{ aspectRatio: `${width} / ${height}` }}>
          {placed.map((k) => {
            const c = counts.get(k.code) ?? 0;
            const t = c / max;
            const mix = c === 0 ? 0 : 14 + 70 * Math.sqrt(t);
            const strong = mix > 48;
            return (
              <div
                key={k.code}
                className="group absolute"
                style={{
                  left: `${(k.x / width) * 100}%`,
                  top: `${(k.y / height) * 100}%`,
                  width: `${(k.w / width) * 100}%`,
                  height: `${(k.h / height) * 100}%`,
                }}
              >
                <button
                  onClick={() => onSelect(k.code)}
                  aria-label={`${keyLabel(k.code)}: ${c} presses`}
                  className="absolute inset-[1.5px] flex items-center justify-center rounded-[7px] border border-line font-medium transition-transform duration-150 hover:z-10 hover:scale-[1.06] focus-visible:outline-2 focus-visible:outline-accent"
                  style={{
                    background: `color-mix(in oklab, var(--accent) ${mix}%, var(--key))`,
                    color: strong ? "#fff" : "var(--ink)",
                    fontSize: "clamp(7px, 1.05cqw, 12px)",
                  }}
                >
                  {shortLabel(k.code)}
                </button>
                <div className="pointer-events-none absolute left-1/2 top-0 z-20 hidden -translate-x-1/2 -translate-y-[calc(100%+4px)] whitespace-nowrap rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-xl group-hover:block">
                  <div className="font-semibold">{keyLabel(k.code)}</div>
                  <div className="text-muted">
                    {c.toLocaleString()} presses · {total > 0 ? ((c / total) * 100).toFixed(2) : "0.00"}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-muted">
        Less
        {[0, 20, 40, 60, 80].map((m) => (
          <span key={m} className="h-3 w-5 rounded border border-line" style={{ background: `color-mix(in oklab, var(--accent) ${m}%, var(--key))` }} />
        ))}
        More · click a key for details
      </div>
    </div>
  );
}
