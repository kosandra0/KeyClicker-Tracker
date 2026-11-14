import { NextResponse } from "next/server";
import { pool } from "@/db";

export const dynamic = "force-dynamic";

/** Delete collected statistics. Requires explicit confirmation in the body. */
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.confirm !== true) {
    return NextResponse.json({ error: "confirm:true required" }, { status: 400 });
  }
  if (body.scope === "all") {
    const r = await pool.query("DELETE FROM input_counts");
    return NextResponse.json({ ok: true, deleted: r.rowCount });
  }
  if (body.scope === "range") {
    const from = new Date(body.from);
    const to = new Date(body.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid range" }, { status: 400 });
    }
    const r = await pool.query(
      "DELETE FROM input_counts WHERE bucket >= $1::timestamptz AND bucket < $2::timestamptz",
      [from, to],
    );
    return NextResponse.json({ ok: true, deleted: r.rowCount });
  }
  return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
}
