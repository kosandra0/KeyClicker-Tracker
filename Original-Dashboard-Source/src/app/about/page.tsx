import { Activity, Check, Minus } from "lucide-react";
import { Card, CardTitle, PageHeader } from "@/components/ui";

const DONE = [
  "Hourly aggregate storage in PostgreSQL (no raw events, no text)",
  "Batched, transactional ingest API with strict identifier validation",
  "Per-key, per-button and scroll statistics, top keys, modifiers, function keys",
  "14 date ranges with local-time-zone / DST-aware boundaries; hourly → yearly aggregation",
  "Keyboard heatmap, mouse visualization, calendar history explorer",
  "CSV and JSON exports (combined, keyboard, mouse, hourly … yearly)",
  "Global pause/resume enforced server-side; visible status indicator",
  "Light/dark themes, reduced-motion support, collapsible sidebar",
  "keyscope-agent: Rust source for Windows low-level keyboard & mouse hooks",
];

const MISSING = [
  "Tauri 2 desktop shell, system tray, close-to-tray, start-with-Windows (not built)",
  "SQLite storage (this build uses PostgreSQL)",
  "Compiled/tested Windows agent, installer and executable (no Windows/Rust toolchain was available)",
  "Mouse movement tracking (intentionally absent)",
  "Native save dialogs (browser downloads are used)",
];

export default function AboutPage() {
  return (
    <div>
      <PageHeader title="About KeyScope" subtitle="Transparent, local input-activity analytics." />
      <Card hover={false} className="mb-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-lav text-white shadow-lg shadow-accent/30">
            <Activity size={26} />
          </span>
          <div>
            <div className="text-xl font-semibold tracking-tight">KeyScope 1.0.0</div>
            <div className="text-sm text-muted">Counts physical key and mouse-button activity. Never records what you type.</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card hover={false}>
          <CardTitle title="Implemented" />
          <ul className="space-y-2 text-sm">
            {DONE.map((d) => (
              <li key={d} className="flex gap-2.5">
                <Check size={15} className="mt-0.5 shrink-0 text-good" />
                {d}
              </li>
            ))}
          </ul>
        </Card>
        <Card hover={false}>
          <CardTitle title="Not implemented / unverified" />
          <ul className="space-y-2 text-sm">
            {MISSING.map((d) => (
              <li key={d} className="flex gap-2.5">
                <Minus size={15} className="mt-0.5 shrink-0 text-warn" />
                {d}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card hover={false} className="mt-4">
        <CardTitle title="Connecting the native Windows agent" hint="Run on a Windows 10/11 machine that can reach this server" />
        <pre className="overflow-auto rounded-xl bg-key p-4 text-xs leading-relaxed">{`cd keyscope-agent
cargo build --release
set KEYSCOPE_URL=http://127.0.0.1:3000
target\\release\\keyscope-agent.exe`}</pre>
        <p className="mt-3 text-xs text-muted">
          The agent installs WH_KEYBOARD_LL and WH_MOUSE_LL hooks, aggregates counts in memory, and posts batched deltas to /api/ingest every few seconds. It runs a visible console window; close it to stop monitoring. Pausing from this app is honored by the agent (it stops counting when the server reports a pause).
        </p>
      </Card>
    </div>
  );
}
