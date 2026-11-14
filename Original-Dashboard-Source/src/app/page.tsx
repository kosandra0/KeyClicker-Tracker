"use client";

import { useMemo } from "react";
import { Keyboard, Mouse, MoveVertical, Zap, Clock, CalendarCheck, Trophy, MousePointerClick } from "lucide-react";
import { useRange } from "@/hooks/range-context";
import { useStats } from "@/hooks/useStats";
import { ActivityChart, StackedBars } from "@/components/charts";
import { RangeBar } from "@/components/RangeBar";
import { Card, CardTitle, EmptyState, PageHeader, StatCard, fmt } from "@/components/ui";
import { keyLabel, MOUSE_LABELS } from "@/lib/keys";
import { fmtBucket } from "@/lib/ranges";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function OverviewPage() {
  const { params, resolved } = useRange();
  const { data, error, loading } = useStats(params);

  // Monthly activity for the current calendar year, independent of the filter.
  const yearParams = useMemo(() => {
    const y = new Date().getFullYear();
    return { from: new Date(y, 0, 1).toISOString(), to: new Date(y + 1, 0, 1).toISOString(), unit: "month" as const };
  }, []);
  const year = useStats(yearParams);

  const insights = useMemo(() => {
    if (!data || data.totals.events === 0) return null;
    const topKey = data.keys[0];
    const topBtn = [...data.mouse].sort((a, b) => b.count - a.count)[0];
    const hour = [...data.hourOfDay].sort((a, b) => b.keys + b.clicks + b.scrolls - (a.keys + a.clicks + a.scrolls))[0];
    return { topKey, topBtn, hour };
  }, [data]);

  const ratio = data && data.totals.clicks + data.totals.keys > 0 ? data.totals.keys / (data.totals.keys + data.totals.clicks) : 0;

  return (
    <div>
      <PageHeader title="Overview" subtitle="Your keyboard and mouse activity, aggregated locally." right={<RangeBar />} />
      {error && <div className="mb-4 rounded-xl border border-line bg-card p-3 text-sm text-warn">{error}</div>}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Key presses" value={data?.totals.keys ?? 0} icon={<Keyboard size={16} />} sub={resolved.label} />
        <StatCard label="Mouse clicks" value={data?.totals.clicks ?? 0} icon={<Mouse size={16} />} tone="lav" sub={resolved.label} />
        <StatCard label="Scroll events" value={data?.totals.scrolls ?? 0} icon={<MoveVertical size={16} />} tone="good" sub={data ? `${fmt(data.totals.scrollDistance)} wheel units` : ""} />
        <StatCard label="Total input events" value={data?.totals.events ?? 0} icon={<Zap size={16} />} tone="ink" sub="keys + clicks + scrolls" />
      </div>

      {loading && !data ? (
        <div className="mt-6 h-72 animate-pulse rounded-[var(--radius)] bg-key" />
      ) : !data || data.totals.events === 0 ? (
        <div className="mt-6">
          <EmptyState />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <Card hover={false}>
            <CardTitle title="Combined activity" hint={`${data.unit} aggregation`} />
            <ActivityChart series={data.series} unit={data.unit} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card hover={false}>
              <CardTitle title="Keyboard activity" />
              <ActivityChart series={data.series} unit={data.unit} mode="keys" height={220} />
            </Card>
            <Card hover={false}>
              <CardTitle title="Mouse activity" />
              <ActivityChart series={data.series} unit={data.unit} mode="mouse" height={220} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card hover={false}>
              <CardTitle title="Hourly distribution" hint="By hour of day (local time)" />
              <StackedBars data={data.hourOfDay} labelFor={(t) => `${String(t).padStart(2, "0")}h`} />
            </Card>
            <Card hover={false}>
              <CardTitle title="Weekly activity" hint="By day of week" />
              <StackedBars data={data.dayOfWeek} labelFor={(t) => DOW[Number(t) - 1]} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card hover={false} className="lg:col-span-2">
              <CardTitle title="Monthly activity" hint={`Calendar year ${new Date().getFullYear()}`} />
              {year.data ? <StackedBars data={year.data.series} labelFor={(t) => fmtBucket(t, "month").slice(0, 3)} /> : <div className="h-[220px] animate-pulse rounded-xl bg-key" />}
            </Card>

            <Card hover={false}>
              <CardTitle title="Insights" />
              {insights && (
                <ul className="space-y-3.5 text-sm">
                  <Insight icon={<Trophy size={15} />} label="Most-used key" value={`${keyLabel(insights.topKey?.id ?? "—")}${insights.topKey ? ` · ${fmt(insights.topKey.count)}` : ""}`} />
                  <Insight icon={<MousePointerClick size={15} />} label="Most-used mouse button" value={insights.topBtn ? `${MOUSE_LABELS[insights.topBtn.id] ?? insights.topBtn.id} · ${fmt(insights.topBtn.count)}` : "No clicks"} />
                  <Insight icon={<Clock size={15} />} label="Most active hour" value={`${String(insights.hour.t).padStart(2, "0")}:00 · ${fmt(insights.hour.keys + insights.hour.clicks + insights.hour.scrolls)}`} />
                  <Insight icon={<CalendarCheck size={15} />} label="Highest activity day" value={data.peakDay ? `${data.peakDay.day} · ${fmt(data.peakDay.events)}` : "—"} />
                  <li>
                    <div className="mb-1.5 flex justify-between text-xs text-muted">
                      <span>Keyboard vs mouse clicks</span>
                      <span>{Math.round(ratio * 100)}% / {Math.round((1 - ratio) * 100)}%</span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-key">
                      <div style={{ width: `${ratio * 100}%`, background: "#7c93d1" }} className="transition-all duration-700" />
                      <div style={{ width: `${(1 - ratio) * 100}%`, background: "#a897dc" }} className="transition-all duration-700" />
                    </div>
                    <div className="mt-1.5 text-xs text-muted">
                      {data.totals.clicks > 0 ? `${(data.totals.keys / data.totals.clicks).toFixed(2)} key presses per click` : "No clicks recorded"}
                    </div>
                  </li>
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Insight({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">{icon}</span>
      <div>
        <div className="text-xs text-muted">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </li>
  );
}
