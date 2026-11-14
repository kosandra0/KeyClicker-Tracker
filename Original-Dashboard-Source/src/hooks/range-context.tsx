"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePref } from "./app-context";
import {
  resolveRange,
  localTz,
  ymd,
  type CustomRange,
  type RangeId,
  type ResolvedRange,
  type Unit,
} from "@/lib/ranges";

interface RangeCtx {
  rangeId: RangeId;
  setRangeId: (r: RangeId) => void;
  custom: CustomRange;
  setCustom: (c: CustomRange) => void;
  unit: Unit;
  setUnit: (u: Unit | null) => void;
  unitOverridden: boolean;
  resolved: ResolvedRange;
  /** Query params for API calls. */
  params: { from: string | null; to: string; unit: Unit };
  tz: string;
}

const Ctx = createContext<RangeCtx | null>(null);

export function useRange(): RangeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRange outside RangeProvider");
  return c;
}

export function RangeProvider({ children }: { children: ReactNode }) {
  const [rangeId, setRangeId] = usePref<RangeId>("ks_range", "last7");
  const today = ymd(new Date());
  const [custom, setCustom] = usePref<CustomRange>("ks_custom", { start: today, end: today });
  const [unitOverride, setUnit] = usePref<Unit | null>("ks_unit", null);
  const dayKey = ymd(new Date());

  const resolved = useMemo(
    () => resolveRange(rangeId, custom),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangeId, custom, dayKey],
  );
  const unit = unitOverride ?? resolved.defaultUnit;
  const params = useMemo(
    () => ({ from: resolved.from ? resolved.from.toISOString() : null, to: resolved.to.toISOString(), unit }),
    [resolved, unit],
  );

  const value = useMemo<RangeCtx>(
    () => ({
      rangeId,
      setRangeId: (r) => {
        setRangeId(r);
        setUnit(null); // reset to the sensible default for the new range
      },
      custom,
      setCustom,
      unit,
      setUnit,
      unitOverridden: unitOverride !== null,
      resolved,
      params,
      tz: localTz(),
    }),
    [rangeId, setRangeId, custom, setCustom, unit, setUnit, unitOverride, resolved, params],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
