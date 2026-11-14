import { NextResponse } from "next/server";
import { getStats, getSeries, resolveFrom } from "@/lib/stats";
import { keyLabel, keyCategory, MOUSE_LABELS, SCROLL_LABELS } from "@/lib/keys";
import type { Unit } from "@/lib/ranges";

export const dynamic = "force-dynamic";

const SERIES_SCOPES: Record<string, Unit> = {
  hourly: "hour",
  daily: "day",
  weekly: "week",
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

type Row = Record<string, string | number>;

function csvCell(v: string | number): string {
  const s = String(v);
  // Guard against spreadsheet formula injection as well as quoting.
  const safe = /^[=+\-@]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function toCsv(rows: Row[], headers: string[]): string {
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h] ?? "")).join(","))].join("\r\n") + "\r\n";
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const scope = sp.get("scope") ?? "combined";
  const format = sp.get("format") === "json" ? "json" : "csv";
  const to = new Date(sp.get("to") ?? "");
  const fromRaw = sp.get("from");
  const from = fromRaw ? new Date(fromRaw) : null;
  const tz = sp.get("tz") || "UTC";
  if (isNaN(to.getTime()) || (from && isNaN(from.getTime()))) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  let rows: Row[] = [];
  let headers: string[] = [];
  let meta: Record<string, unknown> = {};

  try {
    const realFrom = await resolveFrom(from, to);
    meta = { generatedAt: new Date().toISOString(), from: realFrom.toISOString(), to: to.toISOString(), timeZone: tz, scope };

    if (scope in SERIES_SCOPES) {
      const unit = SERIES_SCOPES[scope];
      const series = await getSeries(realFrom, to, tz, unit);
      headers = ["period", "key_presses", "mouse_clicks", "scroll_events", "total_events"];
      rows = series.map((p) => ({
        period: p.t,
        key_presses: p.keys,
        mouse_clicks: p.clicks,
        scroll_events: p.scrolls,
        total_events: p.keys + p.clicks + p.scrolls,
      }));
    } else {
      const s = await getStats({ from, to, tz, unit: "day" });
      const keyRows = s.keys.map((k) => ({
        type: "key",
        id: k.id,
        name: keyLabel(k.id),
        category: keyCategory(k.id),
        count: k.count,
        percent: s.totals.keys ? Number(((k.count / s.totals.keys) * 100).toFixed(3)) : 0,
      }));
      const mouseRows = [
        ...s.mouse.map((m) => ({ type: "mouse_button", id: m.id, name: MOUSE_LABELS[m.id] ?? m.id, category: "Mouse", count: m.count, percent: s.totals.clicks ? Number(((m.count / s.totals.clicks) * 100).toFixed(3)) : 0 })),
        ...s.scroll.map((m) => ({ type: "scroll", id: m.id, name: SCROLL_LABELS[m.id] ?? m.id, category: "Scroll", count: m.count, percent: s.totals.scrolls ? Number(((m.count / s.totals.scrolls) * 100).toFixed(3)) : 0, scroll_units: m.amount ?? 0 })),
      ];
      headers = ["type", "id", "name", "category", "count", "percent", "scroll_units"];
      if (scope === "keyboard") rows = keyRows;
      else if (scope === "mouse") rows = mouseRows;
      else {
        rows = [
          { type: "total", id: "key_presses", name: "Key presses", category: "Total", count: s.totals.keys, percent: 0 },
          { type: "total", id: "mouse_clicks", name: "Mouse clicks", category: "Total", count: s.totals.clicks, percent: 0 },
          { type: "total", id: "scroll_events", name: "Scroll events", category: "Total", count: s.totals.scrolls, percent: 0, scroll_units: s.totals.scrollDistance },
          { type: "total", id: "all_events", name: "All input events", category: "Total", count: s.totals.events, percent: 100 },
          ...keyRows,
          ...mouseRows,
        ];
      }
    }
  } catch (e) {
    console.error("export failed", e);
    return NextResponse.json({ error: "Export failed" }, { status: 400 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `keyscope-${scope}-${stamp}.${format}`;
  const body = format === "json" ? JSON.stringify({ ...meta, rows }, null, 2) : toCsv(rows, headers);
  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
