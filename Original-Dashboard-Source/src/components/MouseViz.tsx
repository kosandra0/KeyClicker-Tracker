"use client";

import { MOUSE_LABELS } from "@/lib/keys";
import type { CountRow } from "@/lib/types";

export function MouseViz({ mouse, scroll }: { mouse: CountRow[]; scroll: CountRow[] }) {
  const c = (id: string) => mouse.find((m) => m.id === id)?.count ?? 0;
  const s = (id: string) => scroll.find((m) => m.id === id)?.count ?? 0;
  const max = Math.max(1, ...mouse.map((m) => m.count));
  const total = mouse.reduce((a, m) => a + m.count, 0);
  const fill = (n: number) => `color-mix(in oklab, var(--accent) ${n === 0 ? 0 : 16 + 70 * Math.sqrt(n / max)}%, var(--key))`;
  const scrollTotal = s("up") + s("down");

  const Label = ({ x, y, anchor, id, n }: { x: number; y: number; anchor: "start" | "end"; id: string; n: number }) => (
    <g>
      <text x={x} y={y} textAnchor={anchor} className="fill-[var(--muted)]" fontSize="12">
        {MOUSE_LABELS[id]}
      </text>
      <text x={x} y={y + 20} textAnchor={anchor} className="fill-[var(--ink)]" fontSize="18" fontWeight="600">
        {n.toLocaleString()}
      </text>
      <text x={x} y={y + 35} textAnchor={anchor} className="fill-[var(--muted)]" fontSize="11">
        {total > 0 ? ((n / total) * 100).toFixed(1) : "0.0"}% of clicks
      </text>
    </g>
  );

  return (
    <svg viewBox="0 0 560 440" className="mx-auto w-full max-w-[560px]" role="img" aria-label="Mouse button usage">
      <defs>
        <clipPath id="mouse-body">
          <rect x="200" y="30" width="160" height="300" rx="80" />
        </clipPath>
      </defs>
      <rect x="200" y="30" width="160" height="300" rx="80" fill="var(--key)" stroke="var(--line)" strokeWidth="2" />
      <g clipPath="url(#mouse-body)">
        <rect x="200" y="30" width="79" height="150" fill={fill(c("left"))} />
        <rect x="281" y="30" width="79" height="150" fill={fill(c("right"))} />
        <rect x="200" y="181" width="160" height="2" fill="var(--line)" />
      </g>
      {/* wheel */}
      <rect x="270" y="70" width="20" height="54" rx="10" fill={fill(c("middle"))} stroke="var(--line)" strokeWidth="2" />
      {/* side buttons */}
      <rect x="190" y="210" width="14" height="40" rx="6" fill={fill(c("x1"))} stroke="var(--line)" strokeWidth="1.5" />
      <rect x="190" y="258" width="14" height="40" rx="6" fill={fill(c("x2"))} stroke="var(--line)" strokeWidth="1.5" />

      {/* leader lines */}
      <g stroke="var(--line)" strokeWidth="1.5" fill="none">
        <path d="M239 100 H170" />
        <path d="M320 100 H390" />
        <path d="M280 97 V20 H390" />
        <path d="M190 230 H150" />
        <path d="M190 278 H150" />
      </g>
      <Label x={160} y={80} anchor="end" id="left" n={c("left")} />
      <Label x={400} y={80} anchor="start" id="right" n={c("right")} />
      <Label x={400} y={8} anchor="start" id="middle" n={c("middle")} />
      <Label x={140} y={225} anchor="end" id="x1" n={c("x1")} />
      <Label x={140} y={273} anchor="end" id="x2" n={c("x2")} />
      <text x="280" y="372" textAnchor="middle" fontSize="12" className="fill-[var(--muted)]">
        Wheel · {scrollTotal.toLocaleString()} vertical scroll events
      </text>
    </svg>
  );
}
