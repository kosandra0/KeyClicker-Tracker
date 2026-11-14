# Architecture

```
 Windows agent (Rust, hooks)  ──┐  POST /api/ingest  (batched hourly deltas, ~5 s)
 In-page capture (optional)   ──┘            │
                                             ▼
                              Next.js route handlers ── validate ── upsert (transaction)
                                             │
                                  PostgreSQL: input_counts(bucket, kind, id, count, amount)
                                             │
              GET /api/stats ◄── date_trunc(unit, bucket AT TIME ZONE tz) + generate_series gap fill
              GET /api/export, GET|POST /api/status, DELETE /api/data
                                             │
                               React UI (range context, 5 s polling)
```

- **Storage:** one narrow table of hourly aggregates; `(bucket, kind, id)` primary key; upsert adds counts.
- **Time zones:** the browser resolves ranges with local `Date(y, m, d)` arithmetic and sends instants plus its IANA zone;
  Postgres groups with `AT TIME ZONE`, so DST transitions are handled by the database.
- **Pause:** `app_settings.monitoring_paused`; the ingest endpoint drops data while paused and returns `paused` so the agent also stops counting.
- **Agent:** hook callbacks only touch an in-memory map under a mutex; a separate thread does the HTTP flush; failed flushes are re-queued.
- **Key ids:** W3C `KeyboardEvent.code` vocabulary, derived from scan code + extended flag in the agent.
