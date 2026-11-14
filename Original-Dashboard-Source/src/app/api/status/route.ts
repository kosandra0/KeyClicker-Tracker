import { NextResponse } from "next/server";
import { pool } from "@/db";
import { getSetting, setSetting } from "@/lib/stats";
import type { StatusResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

function dbInfo() {
  try {
    const u = new URL(process.env.DATABASE_URL ?? "");
    return { host: `${u.hostname}:${u.port || "5432"}`, name: u.pathname.replace(/^\//, "") };
  } catch {
    return { host: "unknown", name: "unknown" };
  }
}

export async function GET() {
  const [paused, lastSeen, agg] = await Promise.all([
    getSetting("monitoring_paused"),
    getSetting("agent_last_seen"),
    pool.query("SELECT count(*)::int AS n, min(bucket) AS a, max(bucket) AS b FROM input_counts"),
  ]);
  const connected = lastSeen ? Date.now() - new Date(lastSeen).getTime() < 30_000 : false;
  const body: StatusResponse = {
    paused: paused === "true",
    agentConnected: connected,
    agentLastSeen: lastSeen,
    totalRows: agg.rows[0].n,
    firstEvent: agg.rows[0].a ? new Date(agg.rows[0].a).toISOString() : null,
    lastEvent: agg.rows[0].b ? new Date(agg.rows[0].b).toISOString() : null,
    db: dbInfo(),
  };
  return NextResponse.json(body);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (typeof body.paused !== "boolean") {
    return NextResponse.json({ error: "paused (boolean) required" }, { status: 400 });
  }
  await setSetting("monitoring_paused", body.paused ? "true" : "false");
  return NextResponse.json({ ok: true, paused: body.paused });
}
