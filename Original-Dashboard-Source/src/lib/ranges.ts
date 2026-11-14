// Date-range maths in the user's LOCAL time zone. Using the Date(y, m, d)
// constructor keeps boundaries correct across daylight-saving transitions.
// `to` is always exclusive.

export type Unit = "hour" | "day" | "week" | "month" | "quarter" | "year";
export const UNITS: Unit[] = ["hour", "day", "week", "month", "quarter", "year"];

export type RangeId =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisWeek"
  | "prevWeek"
  | "thisMonth"
  | "prevMonth"
  | "thisQuarter"
  | "prevQuarter"
  | "thisYear"
  | "prevYear"
  | "all"
  | "custom";

export const RANGE_OPTIONS: { id: RangeId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "thisWeek", label: "This week" },
  { id: "prevWeek", label: "Previous week" },
  { id: "thisMonth", label: "This month" },
  { id: "prevMonth", label: "Previous month" },
  { id: "thisQuarter", label: "This quarter" },
  { id: "prevQuarter", label: "Previous quarter" },
  { id: "thisYear", label: "This year" },
  { id: "prevYear", label: "Previous year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom range" },
];

export const UNIT_LABELS: Record<Unit, string> = {
  hour: "Hourly",
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  quarter: "Quarterly",
  year: "Yearly",
};

export interface CustomRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (inclusive)
}

export interface ResolvedRange {
  from: Date | null;
  to: Date;
  label: string;
  defaultUnit: Unit;
}

export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function sod(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function resolveRange(
  id: RangeId,
  custom?: CustomRange,
  now: Date = new Date(),
): ResolvedRange {
  const today = sod(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  const label = RANGE_OPTIONS.find((r) => r.id === id)?.label ?? "Range";
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const qStart = Math.floor(m / 3) * 3;

  switch (id) {
    case "today":
      return { from: today, to: addDays(today, 1), label, defaultUnit: "hour" };
    case "yesterday":
      return { from: addDays(today, -1), to: today, label, defaultUnit: "hour" };
    case "last7":
      return { from: addDays(today, -6), to: addDays(today, 1), label, defaultUnit: "day" };
    case "last30":
      return { from: addDays(today, -29), to: addDays(today, 1), label, defaultUnit: "day" };
    case "thisWeek":
      return { from: monday, to: addDays(monday, 7), label, defaultUnit: "day" };
    case "prevWeek":
      return { from: addDays(monday, -7), to: monday, label, defaultUnit: "day" };
    case "thisMonth":
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1), label, defaultUnit: "day" };
    case "prevMonth":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1), label, defaultUnit: "day" };
    case "thisQuarter":
      return { from: new Date(y, qStart, 1), to: new Date(y, qStart + 3, 1), label, defaultUnit: "week" };
    case "prevQuarter":
      return { from: new Date(y, qStart - 3, 1), to: new Date(y, qStart, 1), label, defaultUnit: "week" };
    case "thisYear":
      return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1), label, defaultUnit: "month" };
    case "prevYear":
      return { from: new Date(y - 1, 0, 1), to: new Date(y, 0, 1), label, defaultUnit: "month" };
    case "all":
      return { from: null, to: addDays(today, 1), label, defaultUnit: "month" };
    case "custom": {
      const s = custom?.start ? parseYmd(custom.start) : today;
      let e = custom?.end ? parseYmd(custom.end) : s;
      if (e < s) e = s;
      const to = addDays(e, 1);
      const days = Math.round((to.getTime() - s.getTime()) / 864e5);
      const defaultUnit: Unit = days <= 2 ? "hour" : days <= 92 ? "day" : days <= 400 ? "week" : "month";
      return {
        from: s,
        to,
        label: `${ymd(s)} → ${ymd(e)}`,
        defaultUnit,
      };
    }
  }
}

export function localTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a server bucket label (local wall-clock "YYYY-MM-DDTHH:MM:SS"). */
export function fmtBucket(t: string, unit: Unit, long = false): string {
  const y = Number(t.slice(0, 4));
  const mo = Number(t.slice(5, 7));
  const d = Number(t.slice(8, 10));
  const h = t.slice(11, 13);
  switch (unit) {
    case "hour":
      return long ? `${MONTHS[mo - 1]} ${d}, ${h}:00` : `${h}:00`;
    case "day":
      return `${MONTHS[mo - 1]} ${d}`;
    case "week":
      return `Wk ${MONTHS[mo - 1]} ${d}`;
    case "month":
      return `${MONTHS[mo - 1]} ${y}`;
    case "quarter":
      return `${y} Q${Math.floor((mo - 1) / 3) + 1}`;
    case "year":
      return String(y);
  }
}
