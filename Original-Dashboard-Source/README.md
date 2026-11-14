# KeyScope

Local, privacy-first keyboard and mouse **activity counting and analytics**.

> **Read this first — what this repository actually is**
>
> The original brief asked for a Tauri 2 + Rust + SQLite Windows desktop application. The environment this
> was built in is Linux with Node.js and PostgreSQL only: **no Rust toolchain, no Windows, no Tauri.**
> A Windows `.exe`/installer could therefore **not** be produced, and nothing here was compiled for Windows.
>
> What was delivered instead, and verified in the sandbox:
>
> | Part | Stack | Status |
> |---|---|---|
> | Analytics app (UI + API + storage) | Next.js 16, React 19, Tailwind 4, Framer Motion, Recharts, PostgreSQL via Drizzle | Built, type-checked, running |
> | Native Windows capture agent | Rust, `windows-sys` low-level hooks (`keyscope-agent/`) | **Source only — never compiled or run** |
> | Tauri shell, system tray, close-to-tray, start-with-Windows, SQLite | — | **Not implemented** |

## Run the analytics app

```bash
npm install
npx drizzle-kit push        # creates input_counts + app_settings
npm run build && npm start  # http://localhost:3000
```

`DATABASE_URL` is read from `.env`.

## Getting data in

Two sources post aggregate deltas to `POST /api/ingest`:

1. **Native agent (global, Windows only, unverified)** — `cd keyscope-agent && cargo build --release`,
   then `set KEYSCOPE_URL=http://127.0.0.1:3000` and run `target\release\keyscope-agent.exe`.
   Uses `WH_KEYBOARD_LL` / `WH_MOUSE_LL`, ignores injected events and key autorepeat, maps keys by scan code
   to `KeyboardEvent.code` style ids, distinguishes left/right modifiers, counts left/right/middle/X1/X2
   clicks and vertical/horizontal wheel events.
2. **In-page capture (Settings → Monitoring, off by default)** — counts only while the KeyScope tab is focused.
   It exists to exercise the pipeline; it is not global monitoring.

## Features (implemented and in the web app)

- Overview, Keyboard Analytics (ANSI heatmap, top 10, modifiers, F-keys, sortable table, per-key modal),
  Mouse Analytics, Activity History (calendar + hourly), Reports, Settings, About.
- 14 date ranges (local time zone, DST-safe boundaries) and hourly/daily/weekly/monthly/quarterly/yearly aggregation.
- CSV and JSON exports of real aggregates (combined, keyboard, mouse, hourly … yearly).
- Global pause/resume enforced by the server, visible monitoring-status pill, light/dark themes,
  reduced-motion support, collapsible sidebar, delete-range / delete-all.

## Privacy model

Stored: hourly bucket, `kind` (`key`/`mouse`/`scroll`), identifier (e.g. `KeyA`, `left`), count, scroll amount.
Never stored: characters, text, key sequences or inter-key timing, clipboard, cursor position.
The ingest endpoint rejects anything that is not a validated identifier + counts.

## Known limitations

- `/api/ingest` and the other APIs are **unauthenticated** and intended for localhost use. Do not expose the server.
- Buckets are UTC hours; in half-hour-offset time zones local hourly charts are skewed by up to 30 minutes.
- Pause for the native agent takes effect within ~5 s (next flush).
- Exports use browser downloads, not native Windows save dialogs.
- Mouse buttons 4/5 and horizontal scroll depend on what the device driver exposes to Windows.
- No automated tests for the agent; the API/date logic was only exercised manually.

See `docs/ARCHITECTURE.md` and `CHANGELOG.md`.
