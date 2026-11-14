"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import type { SeriesPoint } from "@/lib/types";
import { fmtBucket, type Unit } from "@/lib/ranges";

export const COLORS = {
  keys: "#7c93d1",
  clicks: "#a897dc",
  scrolls: "#74b9a3",
};
export const PALETTE = ["#7c93d1", "#a897dc", "#74b9a3", "#d9a66b", "#d98fa0", "#8fb8d9", "#b3b6c0", "#9fcf87", "#cf9ad6"];

const tick = { fontSize: 11, fill: "#8a8c95" };
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  fontSize: 12,
  boxShadow: "0 8px 24px -8px rgba(0,0,0,.2)",
  color: "var(--ink)",
};

type Mode = "combined" | "keys" | "mouse";

export function ActivityChart({
  series,
  unit,
  mode = "combined",
  height = 260,
}: {
  series: SeriesPoint[];
  unit: Unit;
  mode?: Mode;
  height?: number;
}) {
  const data = series.map((p) => ({ ...p, label: fmtBucket(p.t, unit, series.length > 30 && unit === "hour") }));
  const show = {
    keys: mode !== "mouse",
    clicks: mode !== "keys",
    scrolls: mode !== "keys",
  };
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: -12, right: 8, top: 8 }}>
          <defs>
            {Object.entries(COLORS).map(([k, c]) => (
              <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.35} />
                <stop offset="100%" stopColor={c} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="#8a8c95" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#8a8c95", strokeOpacity: 0.3 }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          {show.keys && (
            <Area type="monotone" dataKey="keys" name="Key presses" stroke={COLORS.keys} strokeWidth={2} fill="url(#g-keys)" animationDuration={700} />
          )}
          {show.clicks && (
            <Area type="monotone" dataKey="clicks" name="Mouse clicks" stroke={COLORS.clicks} strokeWidth={2} fill="url(#g-clicks)" animationDuration={700} />
          )}
          {show.scrolls && (
            <Area type="monotone" dataKey="scrolls" name="Scrolls" stroke={COLORS.scrolls} strokeWidth={2} fill="url(#g-scrolls)" animationDuration={700} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedBars({
  data,
  labelFor,
  height = 220,
}: {
  data: SeriesPoint[];
  labelFor: (t: string) => string;
  height?: number;
}) {
  const d = data.map((p) => ({ ...p, label: labelFor(p.t) }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={d} margin={{ left: -12, right: 8, top: 8 }}>
          <CartesianGrid stroke="#8a8c95" strokeOpacity={0.15} vertical={false} />
          <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={14} />
          <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#8a8c95", fillOpacity: 0.1 }} />
          <Bar dataKey="keys" name="Key presses" stackId="a" fill={COLORS.keys} animationDuration={700} />
          <Bar dataKey="clicks" name="Mouse clicks" stackId="a" fill={COLORS.clicks} animationDuration={700} />
          <Bar dataKey="scrolls" name="Scrolls" stackId="a" fill={COLORS.scrolls} radius={[5, 5, 0, 0]} animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({
  data,
  height = 220,
  centerLabel,
}: {
  data: { name: string; value: number }[];
  height?: number;
  centerLabel?: string;
}) {
  const filtered = data.filter((d) => d.value > 0);
  const total = filtered.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ height }} className="relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={filtered} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="none" animationDuration={700}>
            {filtered.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
          <div className="text-xl font-semibold tabular-nums">{total.toLocaleString()}</div>
          <div className="text-[11px] text-muted">{centerLabel}</div>
        </div>
      )}
    </div>
  );
}

export function HBars({
  items,
  color = COLORS.keys,
  total,
}: {
  items: { label: string; value: number; onClick?: () => void }[];
  color?: string;
  total?: number;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const sum = total ?? items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="space-y-2.5">
      {items.map((it, idx) => (
        <button
          key={it.label}
          onClick={it.onClick}
          disabled={!it.onClick}
          className="group block w-full text-left disabled:cursor-default"
        >
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium">{it.label}</span>
            <span className="tabular-nums text-muted">
              {it.value.toLocaleString()} · {sum > 0 ? ((it.value / sum) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-key">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${(it.value / max) * 100}%` }}
              transition={{ duration: 0.6, delay: idx * 0.03, ease: "easeOut" }}
            />
          </div>
        </button>
      ))}
    </div>
  );
}
