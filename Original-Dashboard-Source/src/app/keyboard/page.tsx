"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useRange } from "@/hooks/range-context";
import { useStats } from "@/hooks/useStats";
import { ActivityChart, Donut, HBars, StackedBars } from "@/components/charts";
import { RangeBar } from "@/components/RangeBar";
import { KeyboardViz } from "@/components/KeyboardViz";
import { Card, CardTitle, EmptyState, Modal, PageHeader, StatCard, fmt, pct } from "@/components/ui";
import { isModifier, keyCategory, keyLabel } from "@/lib/keys";

type SortKey = "name" | "category" | "count";

export default function KeyboardPage() {
  const { params, resolved } = useRange();
  const { data, loading } = useStats(params);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "count", dir: -1 });

  const total = data?.totals.keys ?? 0;
  const keys = data?.keys ?? [];

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    keys.forEach((k) => m.set(keyCategory(k.id), (m.get(keyCategory(k.id)) ?? 0) + k.count));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [keys]);

  const modifiers = keys.filter((k) => isModifier(k.id));
  const fnKeys = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const id = `F${i + 1}`;
        return { t: id, keys: keys.find((k) => k.id === id)?.count ?? 0, clicks: 0, scrolls: 0 };
      }),
    [keys],
  );
  const fnTotal = fnKeys.reduce((s, k) => s + k.keys, 0);
  const modTotal = modifiers.reduce((s, k) => s + k.count, 0);

  const rows = useMemo(() => {
    const f = q.trim().toLowerCase();
    const list = keys
      .map((k) => ({ ...k, name: keyLabel(k.id), category: keyCategory(k.id) }))
      .filter((k) => !f || k.name.toLowerCase().includes(f) || k.id.toLowerCase().includes(f) || k.category.toLowerCase().includes(f));
    list.sort((a, b) => {
      const v = sort.key === "count" ? a.count - b.count : String(a[sort.key]).localeCompare(String(b[sort.key]));
      return v * sort.dir;
    });
    return list;
  }, [keys, q, sort]);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === "count" ? -1 : 1 }));
  const empty = !loading && total === 0;

  return (
    <div>
      <PageHeader title="Keyboard Analytics" subtitle="Per-key press counts. Only physical key identifiers are stored — never text." right={<RangeBar />} />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total presses" value={total} icon={<span className="text-xs font-bold">Σ</span>} sub={resolved.label} />
        <StatCard label="Distinct keys used" value={keys.length} icon={<span className="text-xs font-bold">#</span>} tone="lav" />
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider text-muted">Most pressed</div>
          <div className="mt-3 text-2xl font-semibold">{keys[0] ? keyLabel(keys[0].id) : "—"}</div>
          <div className="mt-2 text-xs text-muted">{keys[0] ? `${fmt(keys[0].count)} · ${pct(keys[0].count, total)}` : "No data"}</div>
        </Card>
        <Card>
          <div className="text-xs font-medium uppercase tracking-wider text-muted">Least pressed (used)</div>
          <div className="mt-3 text-2xl font-semibold">{keys.length ? keyLabel(keys[keys.length - 1].id) : "—"}</div>
          <div className="mt-2 text-xs text-muted">{keys.length ? `${fmt(keys[keys.length - 1].count)} · ${pct(keys[keys.length - 1].count, total)}` : "No data"}</div>
        </Card>
      </div>

      {empty ? (
        <div className="mt-6">
          <EmptyState title="No key presses recorded in this period" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <Card hover={false}>
            <CardTitle title="Keyboard heatmap" hint="Brighter keys are used more often. Hover for details, click for key statistics." />
            <KeyboardViz keys={keys} onSelect={setSelected} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card hover={false}>
              <CardTitle title="Top 10 keys" />
              <HBars
                total={total}
                items={keys.slice(0, 10).map((k) => ({ label: keyLabel(k.id), value: k.count, onClick: () => setSelected(k.id) }))}
              />
            </Card>
            <Card hover={false}>
              <CardTitle title="Key usage distribution" hint="By key category" />
              <Donut data={categories} centerLabel="presses" />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card hover={false}>
              <CardTitle title="Modifier keys" hint={`${fmt(modTotal)} presses · ${pct(modTotal, total)} of keyboard activity`} />
              {modifiers.length ? (
                <HBars total={modTotal} items={modifiers.map((k) => ({ label: keyLabel(k.id), value: k.count, onClick: () => setSelected(k.id) }))} />
              ) : (
                <p className="text-sm text-muted">No modifier keys recorded.</p>
              )}
            </Card>
            <Card hover={false}>
              <CardTitle title="Function keys" hint={`${fmt(fnTotal)} presses · F1–F24`} />
              <StackedBars data={fnKeys} labelFor={(t) => t} height={200} />
            </Card>
          </div>

          <Card hover={false}>
            <CardTitle
              title="All key statistics"
              hint={`${rows.length} of ${keys.length} keys`}
              right={
                <label className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search keys…"
                    className="w-52 rounded-xl border border-line bg-bg py-1.5 pl-8 pr-3 text-sm outline-none focus:border-accent"
                  />
                </label>
              }
            />
            <div className="max-h-[420px] overflow-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs text-muted">
                  <tr>
                    {(["name", "category", "count"] as SortKey[]).map((h) => (
                      <th key={h} className={`cursor-pointer select-none px-4 py-2.5 font-medium capitalize ${h === "count" ? "text-right" : ""}`} onClick={() => toggleSort(h)}>
                        <span className="inline-flex items-center gap-1">
                          {h === "count" ? "Presses" : h}
                          {sort.key === h && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right font-medium">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((k) => (
                    <tr key={k.id} onClick={() => setSelected(k.id)} className="cursor-pointer border-t border-line transition hover:bg-key">
                      <td className="px-4 py-2 font-medium">{k.name}</td>
                      <td className="px-4 py-2 text-muted">{k.category}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmt(k.count)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted">{pct(k.count, total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <KeyDetail code={selected} onClose={() => setSelected(null)} total={total} keys={keys.map((k) => k.id)} />
    </div>
  );
}

function KeyDetail({ code, onClose, total, keys }: { code: string | null; onClose: () => void; total: number; keys: string[] }) {
  const { params } = useRange();
  const { data } = useStats({ ...params, id: code, enabled: !!code });
  const count = data?.totals.keys ?? 0;
  const rank = code ? keys.indexOf(code) + 1 : 0;
  return (
    <Modal open={!!code} onClose={onClose} title={code ? `Key · ${keyLabel(code)}` : ""} wide>
      {code && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Mini label="Total presses" value={fmt(count)} />
            <Mini label="Share of keyboard" value={pct(count, total)} />
            <Mini label="Rank (used keys)" value={rank ? `#${rank} of ${keys.length}` : "Not used"} />
          </div>
          <div className="text-xs text-muted">
            Identifier <code className="rounded bg-key px-1.5 py-0.5">{code}</code> · category {keyCategory(code)}
          </div>
          {data && count > 0 ? (
            <ActivityChart series={data.series} unit={data.unit} mode="keys" height={200} />
          ) : (
            <p className="text-sm text-muted">No presses of this key in the selected period.</p>
          )}
        </div>
      )}
    </Modal>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-key p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
