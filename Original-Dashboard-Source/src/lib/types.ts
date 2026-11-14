import type { Unit } from "./ranges";

export interface CountRow {
  id: string;
  count: number;
  amount?: number;
}

export interface SeriesPoint {
  t: string; // local wall-clock label YYYY-MM-DDTHH:MM:SS
  keys: number;
  clicks: number;
  scrolls: number;
}

export interface StatsResponse {
  from: string;
  to: string;
  unit: Unit;
  totals: {
    keys: number;
    clicks: number;
    scrolls: number;
    scrollDistance: number;
    events: number;
  };
  keys: CountRow[]; // sorted desc
  mouse: CountRow[]; // left,right,middle,x1,x2 (clicks)
  scroll: CountRow[]; // up,down,left,right
  series: SeriesPoint[];
  hourOfDay: SeriesPoint[]; // t = hour number as string
  dayOfWeek: SeriesPoint[]; // t = isodow 1..7
  peakDay: { day: string; events: number } | null;
}

export interface StatusResponse {
  paused: boolean;
  agentConnected: boolean;
  agentLastSeen: string | null;
  totalRows: number;
  firstEvent: string | null;
  lastEvent: string | null;
  db: { host: string; name: string };
}
