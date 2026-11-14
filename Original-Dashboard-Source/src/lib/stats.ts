import { pool } from "@/db";
import type { Unit } from "./ranges";
import type { CountRow, SeriesPoint, StatsResponse } from "./types";

export interface StatsQuery {
  from: Date | null;
  to: Date;
  tz: string;
  unit: Unit;
  id?: string;
}

const INTERVALS: Record<Unit, string> = {
  hour: "1 hour",
  day: "1 day",
  week: "1 week",
  month: "1 month",
  quarter: "3 months",
  year: "1 year",
};

const num = (v: unknown) => Number(v ?? 0);

/** Keep chart sizes sane: coarsen the unit if the range is very long. */
export function clampUnit(unit: Unit, from: Date, to: Date): Unit {
  const days = (to.getTime() - from.getTime()) / 864e5;
  if (unit === "hour" && days > 31) unit = "day";
  if (unit === "day" && days > 800) unit = "month";
  return unit;
}

export async function resolveFrom(from: Date | null, to: Date): Promise<Date> {
  if (from) return from;
  const r = await pool.query("SELECT min(bucket) AS m FROM input_counts");
  return r.rows[0]?.m ?? new Date(to.getTime() - 864e5);
}

function where(q: { id?: string }) {
  return q.id ? " AND id = $4" : "";
}

export async function getSeries(
  from: Date,
  to: Date,
  tz: string,
  unit: Unit,
  id?: string,
): Promise<SeriesPoint[]> {
  const params: unknown[] = [from, to, tz];
  if (id) params.push(id);
  const sql = `
    WITH data AS (
      SELECT date_trunc('${unit}', bucket AT TIME ZONE $3::text) AS t,
        sum(CASE WHEN kind='key' THEN count ELSE 0 END)::float8 AS keys,
        sum(CASE WHEN kind='mouse' THEN count ELSE 0 END)::float8 AS clicks,
        sum(CASE WHEN kind='scroll' THEN count ELSE 0 END)::float8 AS scrolls
      FROM input_counts
      WHERE bucket >= $1::timestamptz AND bucket < $2::timestamptz ${where({ id })}
      GROUP BY 1)
    SELECT to_char(g.t, 'YYYY-MM-DD"T"HH24:MI:SS') AS t,
      coalesce(d.keys,0)::float8 AS keys,
      coalesce(d.clicks,0)::float8 AS clicks,
      coalesce(d.scrolls,0)::float8 AS scrolls
    FROM generate_series(
      date_trunc('${unit}', $1::timestamptz AT TIME ZONE $3::text),
      date_trunc('${unit}', ($2::timestamptz - interval '1 millisecond') AT TIME ZONE $3::text),
      interval '${INTERVALS[unit]}') AS g(t)
    LEFT JOIN data d ON d.t = g.t
    ORDER BY g.t`;
  const r = await pool.query(sql, params);
  return r.rows.map((x) => ({
    t: x.t,
    keys: num(x.keys),
    clicks: num(x.clicks),
    scrolls: num(x.scrolls),
  }));
}

async function groupedBy(
  expr: string,
  from: Date,
  to: Date,
  tz: string,
  id?: string,
): Promise<SeriesPoint[]> {
  const params: unknown[] = [from, to, tz];
  if (id) params.push(id);
  const sql = `
    SELECT ${expr} AS k,
      sum(CASE WHEN kind='key' THEN count ELSE 0 END)::float8 AS keys,
      sum(CASE WHEN kind='mouse' THEN count ELSE 0 END)::float8 AS clicks,
      sum(CASE WHEN kind='scroll' THEN count ELSE 0 END)::float8 AS scrolls
    FROM input_counts
    WHERE bucket >= $1::timestamptz AND bucket < $2::timestamptz ${where({ id })}
    GROUP BY 1`;
  const r = await pool.query(sql, params);
  return r.rows.map((x) => ({
    t: String(x.k),
    keys: num(x.keys),
    clicks: num(x.clicks),
    scrolls: num(x.scrolls),
  }));
}

export async function getStats(q: StatsQuery): Promise<StatsResponse> {
  const from = await resolveFrom(q.from, q.to);
  const unit = clampUnit(q.unit, from, q.to);
  const { to, tz, id } = q;

  const params: unknown[] = [from, to];
  if (id) params.push(id);
  const idc = id ? " AND id = $3" : "";

  const [rows, series, hours, dows, peak] = await Promise.all([
    pool.query(
      `SELECT kind, id, sum(count)::float8 AS count, sum(amount)::float8 AS amount
       FROM input_counts
       WHERE bucket >= $1::timestamptz AND bucket < $2::timestamptz ${idc}
       GROUP BY kind, id`,
      params,
    ),
    getSeries(from, to, tz, unit, id),
    groupedBy(`extract(hour from bucket AT TIME ZONE $3::text)::int`, from, to, tz, id),
    groupedBy(`extract(isodow from bucket AT TIME ZONE $3::text)::int`, from, to, tz, id),
    pool.query(
      `SELECT to_char(date_trunc('day', bucket AT TIME ZONE $3::text), 'YYYY-MM-DD') AS d,
              sum(count)::float8 AS n
       FROM input_counts
       WHERE bucket >= $1::timestamptz AND bucket < $2::timestamptz ${id ? " AND id = $4" : ""}
       GROUP BY 1 ORDER BY 2 DESC LIMIT 1`,
      id ? [from, to, tz, id] : [from, to, tz],
    ),
  ]);

  const keys: CountRow[] = [];
  const mouse: CountRow[] = [];
  const scroll: CountRow[] = [];
  let scrollDistance = 0;
  for (const r of rows.rows) {
    const row = { id: r.id as string, count: num(r.count), amount: num(r.amount) };
    if (r.kind === "key") keys.push(row);
    else if (r.kind === "mouse") mouse.push(row);
    else if (r.kind === "scroll") {
      scroll.push(row);
      scrollDistance += row.amount;
    }
  }
  keys.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
  const sum = (a: CountRow[]) => a.reduce((s, x) => s + x.count, 0);
  const totals = {
    keys: sum(keys),
    clicks: sum(mouse),
    scrolls: sum(scroll),
    scrollDistance,
    events: sum(keys) + sum(mouse) + sum(scroll),
  };

  const fill = (data: SeriesPoint[], values: number[]) =>
    values.map((v) => data.find((d) => d.t === String(v)) ?? { t: String(v), keys: 0, clicks: 0, scrolls: 0 });

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    unit,
    totals,
    keys,
    mouse,
    scroll,
    series,
    hourOfDay: fill(hours, Array.from({ length: 24 }, (_, i) => i)),
    dayOfWeek: fill(dows, [1, 2, 3, 4, 5, 6, 7]),
    peakDay: peak.rows[0] ? { day: peak.rows[0].d, events: num(peak.rows[0].n) } : null,
  };
}

// ---- settings helpers -------------------------------------------------------

export async function getSetting(key: string): Promise<string | null> {
  const r = await pool.query("SELECT value FROM app_settings WHERE key = $1", [key]);
  return r.rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}
