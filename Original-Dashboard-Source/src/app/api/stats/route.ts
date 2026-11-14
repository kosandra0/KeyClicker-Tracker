import { NextResponse } from "next/server";
import { getStats } from "@/lib/stats";
import { UNITS, type Unit } from "@/lib/ranges";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const to = new Date(sp.get("to") ?? "");
  const fromRaw = sp.get("from");
  const from = fromRaw ? new Date(fromRaw) : null;
  const unit = (sp.get("unit") ?? "day") as Unit;
  if (isNaN(to.getTime()) || (from && isNaN(from.getTime())) || !UNITS.includes(unit)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  const id = sp.get("id") || undefined;
  if (id && !/^[A-Za-z0-9_]{1,32}$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const data = await getStats({ from, to, unit, tz: sp.get("tz") || "UTC", id });
    return NextResponse.json(data);
  } catch (e) {
    console.error("stats failed", e);
    return NextResponse.json({ error: "Query failed (check time zone / parameters)" }, { status: 400 });
  }
}
