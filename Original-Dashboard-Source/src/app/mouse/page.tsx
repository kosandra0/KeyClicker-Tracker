"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { useRange } from "@/hooks/range-context";
import { useStats } from "@/hooks/useStats";
import { ActivityChart, Donut, HBars, COLORS } from "@/components/charts";
import { RangeBar } from "@/components/RangeBar";
import { MouseViz } from "@/components/MouseViz";
import { Card, CardTitle, EmptyState, PageHeader, StatCard, fmt, pct } from "@/components/ui";
import { MOUSE_LABELS } from "@/lib/keys";

export default function MousePage() {
  const { params, resolved } = useRange();
  const { data, loading } = useStats(params);
  const mouse = data?.mouse ?? [];
  const scroll = data?.scroll ?? [];
  const c = (id: string) => mouse.find((m) => m.id === id)?.count ?? 0;
  const s = (id: string) => scroll.find((m) => m.id === id) ?? { id, count: 0, amount: 0 };
  const clicks = data?.totals.clicks ?? 0;
  const scrolls = data?.totals.scrolls ?? 0;
  const empty = !loading && clicks + scrolls === 0;
  const dirs = [
    { id: "up", icon: <ArrowUp size={14} />, label: "Up" },
    { id: "down", icon: <ArrowDown size={14} />, label: "Down" },
    { id: "left", icon: <ArrowLeft size={14} />, label: "Left" },
    { id: "right", icon: <ArrowRight size={14} />, label: "Right" },
  ];

  return (
    <div>
      <PageHeader title="Mouse Analytics" subtitle="Button clicks and scroll activity. Cursor position is never recorded." right={<RangeBar />} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <StatCard label="Left clicks" value={c("left")} icon={<span className="text-xs font-bold">L</span>} sub={pct(c("left"), clicks)} />
        <StatCard label="Right clicks" value={c("right")} icon={<span className="text-xs font-bold">R</span>} tone="lav" sub={pct(c("right"), clicks)} />
        <StatCard label="Middle clicks" value={c("middle")} icon={<span className="text-xs font-bold">M</span>} tone="good" sub={pct(c("middle"), clicks)} />
        <StatCard label="Mouse 4 (Back)" value={c("x1")} icon={<span className="text-xs font-bold">4</span>} tone="ink" sub={pct(c("x1"), clicks)} />
        <StatCard label="Mouse 5 (Forward)" value={c("x2")} icon={<span className="text-xs font-bold">5</span>} tone="ink" sub={pct(c("x2"), clicks)} />
      </div>

      {empty ? (
        <div className="mt-6">
          <EmptyState title="No mouse activity recorded in this period" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 lg:grid-cols-5">
            <Card hover={false} className="lg:col-span-3">
              <CardTitle title="Button usage" hint={`${fmt(clicks)} clicks · ${resolved.label}`} />
              <MouseViz mouse={mouse} scroll={scroll} />
            </Card>
            <Card hover={false} className="lg:col-span-2">
              <CardTitle title="Click distribution" />
              <Donut data={mouse.map((m) => ({ name: MOUSE_LABELS[m.id] ?? m.id, value: m.count }))} centerLabel="clicks" />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card hover={false}>
              <CardTitle title="Scroll direction" hint={`${fmt(scrolls)} scroll events · ${fmt(data?.totals.scrollDistance ?? 0)} wheel units (120 = one notch)`} />
              <div className="mb-4 grid grid-cols-4 gap-3">
                {dirs.map((d) => (
                  <div key={d.id} className="rounded-xl bg-key p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      {d.icon}
                      {d.label}
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">{fmt(s(d.id).count)}</div>
                    <div className="text-[11px] text-muted">{fmt(s(d.id).amount ?? 0)} units</div>
                  </div>
                ))}
              </div>
              <HBars
                color={COLORS.scrolls}
                total={scrolls}
                items={dirs.map((d) => ({ label: `Scroll ${d.label.toLowerCase()}`, value: s(d.id).count }))}
              />
            </Card>
            <Card hover={false}>
              <CardTitle title="Historical activity" hint={`${data?.unit ?? ""} aggregation`} />
              {data && <ActivityChart series={data.series} unit={data.unit} mode="mouse" height={250} />}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
