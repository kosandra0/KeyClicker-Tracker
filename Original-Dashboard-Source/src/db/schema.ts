import {
  bigint,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Hourly aggregate buckets. No raw events, no typed text, no sequences.
 *   kind = 'key'    -> id is a physical key code (e.g. KeyA, ShiftLeft)
 *   kind = 'mouse'  -> id is left | right | middle | x1 | x2   (clicks)
 *   kind = 'scroll' -> id is up | down | left | right         (count + amount)
 */
export const inputCounts = pgTable(
  "input_counts",
  {
    bucket: timestamp("bucket", { withTimezone: true }).notNull(),
    kind: text("kind").notNull(),
    id: text("id").notNull(),
    count: bigint("count", { mode: "number" }).notNull().default(0),
    amount: bigint("amount", { mode: "number" }).notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.bucket, t.kind, t.id] }),
    index("input_counts_kind_id_idx").on(t.kind, t.id),
  ],
);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
