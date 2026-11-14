"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { ActivityChart, HBars, StackedBars } from "@/components/charts";
import { Button, Card, CardTitle, PageHeader, fmt } from "@/components/ui";
import { addDays, parseYmd, ymd } from "@/lib/ranges";
import { keyLabel, MOUSE_LABELS } from "@/lib/keys";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function HistoryPage() {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [day, setDay] = useState(ymd(now));

  const monthParams = useMemo(
    () => ({
      from: new Date(cursor.y, cursor.m, 1).toISOString(),
      to: new Date(cursor.y, cursor.m + 1, 1).toISOString(),
      unit: "day" as const,
    }),
    [cursor],
  );
  const month = useStats(monthParams);

  const dayParams = useMemo(() => {
    const d = parseYmd(day);
    return { from: d.toISOString(), to: addDays(d, 1).toISOString(), unit: "hour" as const };
  }, [day]);
  const dayStats = useStats(dayParams);

  const totals = useMemo(() => {
    const m = new Map<string, number>();
    month.data?.series.forEach((p) => m.set(p.t.slice(0, 10), p.keys + p.clicks + p.scrolls));
    return m;
  }, [month.data]);
  const max = Math.max(1, ...totals.values());

  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => ymd(new Date(cursor.y, cursor.m, i + 1))),
  ];
  const todayStr = ymd(now);

  const shift = (n: number) => setCursor((c) => {
    const d = new Date(c.y, c.m + n, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const jump = (s: string) => {
    if (!s) return;
    const d = parseYmd(s);
    setDay(s);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const stepDay = (n: number) => jump(ymd(addDays(parseYmd(day), n)));

  const monthTotal = [...totals.values()].reduce((a, b) => a + b, 0);
  const d = dayStats.data;

  return (
    <div>
      <PageHeader
        title="Activity History"
        subtitle="Browse past activity by day and hour. This view is read-only."
        right={
          <input
            type="date"
            aria-label="Jump to date"
            value={day}
            max={todayStr}
            onChange={(e) => jump(e.target.value)}
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm"
          />
        }
      />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card hover={false} className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold">
                {MONTH_NAMES[cursor.m]} {cursor.y}
              </div>
              <div className="text-xs text-muted">{fmt(monthTotal)} events this month</div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" onClick={() => shift(-1)} className="!p-2">
                <ChevronLeft size={16} />
              </Button>
              <Button variant="ghost" onClick={() => jump(todayStr)} className="!px-2.5 !py-1 text-xs">
                Today
              </Button>
              <Button variant="ghost" onClick={() => shift(1)} className="!p-2">
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1.5">
            {cells.map((c, i) => {
              if (!c) return <div key={`e${i}`} />;
              const n = totals.get(c) ?? 0;
              const mix = n === 0 ? 0 : 18 + 62 * Math.sqrt(n / max);
              const sel = c === day;
              return (
                <button
                  key={c}
                  onClick={() => setDay(c)}
                  title={`${c}: ${fmt(n)} events`}
                  className={`relative aspect-square rounded-xl text-xs font-medium transition hover:scale-105 ${sel ? "ring-2 ring-accent" : "ring-1 ring-line"} ${c === todayStr ? "underline underline-offset-4" : ""}`}
                  style={{
                    background: `color-mix(in oklab, var(--accent) ${mix}%, var(--key))`,
                    color: mix > 50 ? "#fff" : "var(--ink)",
                  }}
                >
                  {Number(c.slice(8))}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted">Color intensity reflects total input events per day.</p>
        </Card>

        <Card hover={false} className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <CardTitle title={parseYmd(day).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })} hint="Hourly breakdown (local time)" />
            <div className="flex gap-1">
              <Button variant="ghost" onClick={() => stepDay(-1)} className="!p-2"><ChevronLeft size={16} /></Button>
              <Button variant="ghost" onClick={() => stepDay(1)} className="!p-2"><ChevronRight size={16} /></Button>
            </div>
          </div>
          {d && d.totals.events > 0 ? (
            <>
              <div className="mb-4 grid grid-cols-4 gap-3">
                {[
                  ["Key presses", d.totals.keys],
                  ["Mouse clicks", d.totals.clicks],
                  ["Scrolls", d.totals.scrolls],
                  ["Total", d.totals.events],
                ].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl bg-key p-3">
                    <div className="text-xs text-muted">{l}</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">{fmt(v as number)}</div>
                  </div>
                ))}
              </div>
              <ActivityChart series={d.series} unit="hour" height={220} />
            </>
          ) : (
            <div className="grid h-60 place-items-center rounded-xl border border-dashed border-line text-sm text-muted">
              No activity recorded on this day.
            </div>
          )}
        </Card>
      </div>

      {d && d.totals.events > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card hover={false}>
            <CardTitle title="Keyboard on this day" hint="Top 8 keys" />
            <HBars total={d.totals.keys} items={d.keys.slice(0, 8).map((k) => ({ label: keyLabel(k.id), value: k.count }))} />
          </Card>
          <Card hover={false}>
            <CardTitle title="Mouse on this day" />
            {d.mouse.length ? (
              <HBars color="#a897dc" total={d.totals.clicks} items={d.mouse.map((m) => ({ label: MOUSE_LABELS[m.id] ?? m.id, value: m.count }))} />
            ) : (
              <p className="text-sm text-muted">No clicks.</p>
            )}
            <div className="mt-5">
              <StackedBars data={d.hourOfDay} labelFor={(t) => `${String(t).padStart(2, "0")}`} height={140} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
