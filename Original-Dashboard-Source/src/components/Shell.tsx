"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  CalendarDays,
  FileText,
  Info,
  Keyboard,
  LayoutDashboard,
  Mouse,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Settings,
} from "lucide-react";
import { useApp } from "@/hooks/app-context";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/keyboard", label: "Keyboard Analytics", icon: Keyboard },
  { href: "/mouse", label: "Mouse Analytics", icon: Mouse },
  { href: "/history", label: "Activity History", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/about", label: "About KeyScope", icon: Info },
];

export function StatusPill() {
  const { status, captureEnabled, setPaused } = useApp();
  let tone = "bg-muted";
  let text = "Connecting…";
  let detail = "";
  if (status) {
    if (status.paused) {
      tone = "bg-warn";
      text = "Monitoring paused";
    } else if (status.agentConnected) {
      tone = "bg-good ks-pulse";
      text = "Monitoring active";
      detail = "Native agent";
    } else if (captureEnabled) {
      tone = "bg-good ks-pulse";
      text = "Monitoring active";
      detail = "In-page capture";
    } else {
      tone = "bg-muted";
      text = "No input source connected";
    }
  }
  const canToggle = !!status;
  return (
    <div className="flex items-center gap-2">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium"
      >
        <span className={`h-2 w-2 rounded-full ${tone}`} />
        {text}
        {detail && <span className="text-muted">· {detail}</span>}
      </div>
      {canToggle && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => setPaused(!status!.paused)}
          className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-xs font-medium transition hover:bg-key"
        >
          {status!.paused ? <Play size={12} /> : <Pause size={12} />}
          {status!.paused ? "Resume" : "Pause"}
        </motion.button>
      )}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useApp();

  return (
    <div className="flex h-screen overflow-hidden">
      <motion.aside
        animate={{ width: collapsed ? 76 : 244 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="flex shrink-0 flex-col border-r border-line bg-side px-3 py-4"
      >
        <div className="mb-6 flex items-center gap-3 px-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-accent to-lav text-white shadow-md shadow-accent/30">
            <Activity size={18} />
          </span>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">KeyScope</div>
              <div className="text-[11px] text-muted">Input analytics</div>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1" aria-label="Main">
          {NAV.map((n) => {
            const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                title={collapsed ? n.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "text-ink" : "text-muted hover:text-ink"}`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-card shadow-sm ring-1 ring-line"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <Icon size={18} className={`relative shrink-0 ${active ? "text-accent" : ""}`} />
                {!collapsed && <span className="relative truncate">{n.label}</span>}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition hover:bg-key hover:text-ink"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && "Collapse"}
        </button>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line px-8 py-3">
          <div className="text-xs text-muted">Local-only · counts and identifiers, never typed text</div>
          <StatusPill />
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-7">
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
