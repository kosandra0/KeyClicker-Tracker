import { NextResponse } from "next/server";
import { pool } from "@/db";
import { KEY_ID_RE } from "@/lib/keys";
import { getSetting, setSetting } from "@/lib/stats";

export const dynamic = "force-dynamic";

const HOUR = 3600_000;
const MOUSE_IDS = new Set(["left", "right", "middle", "x1", "x2"]);
const SCROLL_IDS = new Set(["up", "down", "left", "right"]);

interface Delta {
  ts: number;
  kind: "key" | "mouse" | "scroll";
  id: string;
  count: number;
  amount?: number;
}

/**
 * Accepts batched aggregate deltas from a capture source (native agent or the
 * optional in-page capture). Only key ids, button ids, timestamps and counts
 * are accepted – strict validation rejects anything that is not an identifier.
 */
export async function POST(req: Request) {
  let body: { source?: string; version?: string; deltas?: Delta[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const source = body.source === "native" ? "native" : "browser";
  if (source === "native") {
    await setSetting("agent_last_seen", new Date().toISOString());
    if (body.version) await setSetting("agent_version", String(body.version).slice(0, 32));
  }

  const paused = (await getSetting("monitoring_paused")) === "true";
  const deltas = Array.isArray(body.deltas) ? body.deltas.slice(0, 5000) : [];
  if (paused || deltas.length === 0) {
    return NextResponse.json({ ok: true, paused, accepted: 0 });
  }

  const now = Date.now();
  const merged = new Map<string, { bucket: number; kind: string; id: string; count: number; amount: number }>();
  for (const d of deltas) {
    if (!d || typeof d !== "object") continue;
    const count = Math.floor(Number(d.count));
    const amount = Math.max(0, Math.floor(Number(d.amount ?? 0)));
    const ts = Number(d.ts);
    if (!Number.isFinite(ts) || ts < 946684800000 || ts > now + HOUR) continue;
    if (!Number.isFinite(count) || count < 1 || count > 1_000_000) continue;
    if (typeof d.id !== "string" || !KEY_ID_RE.test(d.id)) continue;
    if (d.kind === "mouse" && !MOUSE_IDS.has(d.id)) continue;
    if (d.kind === "scroll" && !SCROLL_IDS.has(d.id)) continue;
    if (d.kind !== "key" && d.kind !== "mouse" && d.kind !== "scroll") continue;
    const bucket = Math.floor(ts / HOUR) * HOUR;
    const k = `${bucket}|${d.kind}|${d.id}`;
    const cur = merged.get(k);
    if (cur) {
      cur.count += count;
      cur.amount += Number.isFinite(amount) ? amount : 0;
    } else {
      merged.set(k, { bucket, kind: d.kind, id: d.id, count, amount: Number.isFinite(amount) ? amount : 0 });
    }
  }

  const items = [...merged.values()];
  if (items.length === 0) return NextResponse.json({ ok: true, paused, accepted: 0 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const CHUNK = 500;
    for (let i = 0; i < items.length; i += CHUNK) {
      const part = items.slice(i, i + CHUNK);
      const values: unknown[] = [];
      const tuples = part.map((it, j) => {
        const o = j * 5;
        values.push(new Date(it.bucket), it.kind, it.id, it.count, it.amount);
        return `($${o + 1}::timestamptz,$${o + 2},$${o + 3},$${o + 4}::bigint,$${o + 5}::bigint)`;
      });
      await client.query(
        `INSERT INTO input_counts (bucket, kind, id, count, amount) VALUES ${tuples.join(",")}
         ON CONFLICT (bucket, kind, id) DO UPDATE
         SET count = input_counts.count + EXCLUDED.count,
             amount = input_counts.amount + EXCLUDED.amount`,
        values,
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("ingest failed", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true, paused: false, accepted: items.length });
}
