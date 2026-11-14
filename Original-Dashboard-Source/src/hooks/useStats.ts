"use client";

import { useEffect, useState } from "react";
import type { StatsResponse } from "@/lib/types";
import { localTz, type Unit } from "@/lib/ranges";

export interface StatsParams {
  from: string | null;
  to: string;
  unit: Unit;
  id?: string | null;
  enabled?: boolean;
}

export function statsQuery(p: Pick<StatsParams, "from" | "to" | "unit" | "id">): string {
  const q = new URLSearchParams({ to: p.to, unit: p.unit, tz: localTz() });
  if (p.from) q.set("from", p.from);
  if (p.id) q.set("id", p.id);
  return q.toString();
}

/** Fetches aggregate stats and refreshes every 5s so live data appears. */
export function useStats(p: StatsParams) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { from, to, unit, id, enabled = true } = p;

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    let first = true;
    const load = async () => {
      try {
        if (first) setLoading(true);
        const r = await fetch(`/api/stats?${statsQuery({ from, to, unit, id })}`, {
          signal: ctrl.signal,
          cache: "no-store",
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Request failed");
        setData(j);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
        first = false;
      }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => {
      ctrl.abort();
      clearInterval(iv);
    };
  }, [from, to, unit, id, enabled]);

  return { data, error, loading };
}
