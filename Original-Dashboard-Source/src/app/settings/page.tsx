"use client";

import { useState, type ReactNode } from "react";
import { Database, Download, EyeOff, Monitor, Palette, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/hooks/app-context";
import { useRange } from "@/hooks/range-context";
import { Button, Card, Modal, PageHeader, Segmented, Toggle } from "@/components/ui";

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-t border-line py-3.5 first:border-t-0 first:pt-0 last:pb-0">
      <div>
        <div className="text-sm font-medium">{title}</div>
        {desc && <div className="mt-0.5 max-w-xl text-xs text-muted">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card hover={false} className="mb-4">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</span>
        <h2 className="text-[15px] font-semibold">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const app = useApp();
  const { resolved, params } = useRange();
  const { status } = app;
  const [confirm, setConfirm] = useState<null | "all" | "range">(null);
  const [busy, setBusy] = useState(false);

  const doDelete = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const r = await fetch("/api/data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, scope: confirm, from: params.from ?? new Date(0).toISOString(), to: params.to }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      app.toast(`Deleted ${j.deleted} aggregate rows`, "success");
      app.refreshStatus();
    } catch (e) {
      app.toast((e as Error).message || "Delete failed", "error");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const lastSeen = status?.agentLastSeen ? new Date(status.agentLastSeen).toLocaleString() : "never";

  return (
    <div>
      <PageHeader title="Settings" subtitle="Preferences are stored locally in this browser; statistics live in your PostgreSQL database." />

      <Section icon={<Palette size={16} />} title="Appearance">
        <Row title="Theme" desc="Light, dark, or follow the operating system.">
          <Segmented id="theme" value={app.theme} onChange={app.setTheme} options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "system", label: "System" }]} />
        </Row>
        <Row title="UI animations" desc="Reduced motion removes sliding and spring effects.">
          <Segmented id="motion" value={app.motionPref} onChange={app.setMotionPref} options={[{ value: "system", label: "System" }, { value: "full", label: "Full" }, { value: "reduced", label: "Reduced" }]} />
        </Row>
        <Row title="Corner style" desc="Rounded or compact card corners.">
          <Segmented id="radius" value={app.radius} onChange={app.setRadius} options={[{ value: "round", label: "Rounded" }, { value: "compact", label: "Compact" }]} />
        </Row>
        <Row title="Collapse sidebar" desc="Icon-only navigation.">
          <Toggle label="Collapse sidebar" checked={app.collapsed} onChange={app.setCollapsed} />
        </Row>
      </Section>

      <Section icon={<Monitor size={16} />} title="Monitoring">
        <Row title="Monitoring state" desc="Global pause. While paused, the ingest API discards all incoming counts — for the native agent and in-page capture alike.">
          <Button variant={status?.paused ? "primary" : "default"} onClick={() => status && app.setPaused(!status.paused)} disabled={!status}>
            {status?.paused ? "Resume monitoring" : "Pause monitoring"}
          </Button>
        </Row>
        <Row
          title="Native Windows agent"
          desc={`Global keyboard and mouse hooks (keyscope-agent, Windows only). Status: ${status?.agentConnected ? "connected" : "not connected"} · last heartbeat: ${lastSeen}. See the About page for setup.`}
        >
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${status?.agentConnected ? "bg-good/15 text-good" : "bg-key text-muted"}`}>
            {status?.agentConnected ? "Connected" : "Offline"}
          </span>
        </Row>
        <Row
          title="In-page capture (this tab only)"
          desc="Counts keys, clicks and scrolls only while this KeyScope tab is focused. Useful to verify the pipeline; it is NOT global monitoring. Off by default."
        >
          <Toggle label="In-page capture" checked={app.captureEnabled} onChange={(v) => { app.setCaptureEnabled(v); app.toast(v ? "In-page capture enabled" : "In-page capture disabled", "info"); }} />
        </Row>
        <Row title="Mouse movement tracking" desc="Not implemented. KeyScope never records cursor position or movement.">
          <span className="rounded-full bg-key px-3 py-1 text-xs text-muted">Never</span>
        </Row>
      </Section>

      <Section icon={<ShieldCheck size={16} />} title="Privacy">
        {[
          ["Local-only storage", "Data is stored in your own PostgreSQL database. Nothing is sent to any third party."],
          ["No typed-text recording", "Only physical key identifiers (e.g. KeyA) and hourly counts are stored; no sequences or timing between keys."],
          ["No password or clipboard capture", "The ingest API rejects anything that is not a key/button identifier plus counts."],
        ].map(([t, d]) => (
          <Row key={t} title={t} desc={d}>
            <EyeOff size={16} className="text-good" />
          </Row>
        ))}
        <Row title="Delete the selected range" desc={`Permanently deletes aggregates in: ${resolved.label}.`}>
          <Button variant="danger" onClick={() => setConfirm("range")}>
            <Trash2 size={14} /> Delete range
          </Button>
        </Row>
        <Row title="Delete all statistics" desc="Permanently removes every collected count.">
          <Button variant="danger" onClick={() => setConfirm("all")}>
            <Trash2 size={14} /> Delete everything
          </Button>
        </Row>
      </Section>

      <Section icon={<Database size={16} />} title="Data">
        <Row title="Database" desc={`PostgreSQL ${status?.db.host ?? "…"} / ${status?.db.name ?? "…"} · ${status?.totalRows ?? 0} hourly aggregate rows`}>
          <span />
        </Row>
        <Row title="Collected period" desc={status?.firstEvent ? `${new Date(status.firstEvent).toLocaleString()} → ${new Date(status.lastEvent!).toLocaleString()}` : "No data collected yet."}>
          <span />
        </Row>
        <Row title="Export statistics" desc="CSV or JSON for any range and granularity.">
          <Link href="/reports" className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-3.5 py-2 text-sm font-medium transition hover:bg-key">
            <Download size={14} /> Open Reports
          </Link>
        </Row>
      </Section>

      <p className="text-xs text-muted">
        Tray behavior, close behavior, start-with-Windows and global pause shortcuts belong to a desktop shell and are not available in this web build.
      </p>

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Delete statistics?">
        <p className="text-sm text-muted">
          {confirm === "all" ? "This permanently deletes ALL collected statistics." : `This permanently deletes statistics for “${resolved.label}”.`} This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="primary" className="!bg-[#c24b4b]" onClick={doDelete} disabled={busy}>
            {busy ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
