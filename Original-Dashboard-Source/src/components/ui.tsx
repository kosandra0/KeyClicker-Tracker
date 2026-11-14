"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, animate, motion } from "framer-motion";
import { X, Inbox } from "lucide-react";

export function Card({
  children,
  className = "",
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`rounded-[var(--radius)] border border-line bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_8px_24px_-12px_rgba(0,0,0,0.08)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CardTitle({ title, hint, right }: { title: string; hint?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

export function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const c = animate(shown, value, {
      duration: 0.7,
      ease: "easeOut",
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{shown.toLocaleString()}</>;
}

export function StatCard({
  label,
  value,
  icon,
  sub,
  tone = "accent",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  sub?: string;
  tone?: "accent" | "lav" | "good" | "ink";
}) {
  const toneCls = {
    accent: "bg-accent-soft text-accent",
    lav: "bg-[color-mix(in_oklab,var(--lav)_18%,var(--card))] text-lav",
    good: "bg-[color-mix(in_oklab,var(--good)_18%,var(--card))] text-good",
    ink: "bg-key text-ink",
  }[tone];
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${toneCls}`}>{icon}</span>
      </div>
      <div className="mt-3 text-[32px] font-semibold leading-none tracking-tight tabular-nums">
        <AnimatedNumber value={value} />
      </div>
      {sub && <div className="mt-2 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function EmptyState({ title = "No activity recorded in this period", hint }: { title?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-line px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-key text-muted">
        <Inbox size={22} />
      </span>
      <div className="text-[15px] font-medium">{title}</div>
      <p className="max-w-md text-sm text-muted">
        {hint ?? "KeyScope only shows real recorded counts. Start the native Windows agent or enable in-page capture to begin collecting data."}
      </p>
      <Link
        href="/settings"
        className="mt-1 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98]"
      >
        Open monitoring settings
      </Link>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "default",
  className = "",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "primary" | "danger" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const v = {
    default: "border border-line bg-card hover:bg-key",
    primary: "bg-accent text-white hover:opacity-90",
    danger: "border border-[color-mix(in_oklab,#d05050_40%,var(--line))] text-[#c24b4b] hover:bg-[color-mix(in_oklab,#d05050_10%,var(--card))]",
    ghost: "hover:bg-key",
  }[variant];
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${v} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div className="inline-flex rounded-xl bg-key p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${value === o.value ? "text-ink" : "text-muted hover:text-ink"}`}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 rounded-lg bg-card shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-line"}`}
    >
      <motion.span
        animate={{ x: checked ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
      />
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className={`max-h-[90vh] w-full overflow-auto rounded-[calc(var(--radius)+4px)] border border-line bg-card p-6 shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-muted hover:bg-key hover:text-ink">
                <X size={16} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export const fmt = (n: number) => n.toLocaleString();
export const pct = (n: number, total: number) => (total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "0%");
