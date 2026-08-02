import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ORDER_STATUS_FLOW } from "../lib/store";
import type { OrderStatus } from "../lib/store";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-panel p-4 ${className}`}>{children}</div>;
}

export type BadgeTone = "neutral" | "accent" | "terracotta" | "success" | "danger" | "muted";

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  const tones: Record<BadgeTone, string> = {
    neutral: "border-line bg-panel-2 text-foreground",
    accent: "border-accent/40 bg-accent/15 text-accent",
    terracotta: "border-terracotta/40 bg-terracotta/15 text-terracotta",
    success: "border-success/40 bg-success/15 text-success",
    danger: "border-danger/40 bg-danger/15 text-danger",
    muted: "border-line bg-panel-2 text-muted",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Button({
  children,
  className = "",
  variant = "primary",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" }) {
  const variants = {
    primary: "border-accent bg-accent text-ink hover:brightness-110",
    ghost: "border-transparent text-foreground hover:bg-panel-2",
    outline: "border-line text-foreground hover:bg-panel-2",
    danger: "border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent ${className}`}
    />
  );
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent ${className}`}
    >
      {children}
    </select>
  );
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={`w-full rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent ${className}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "accent" | "terracotta" | "success" | "danger";
}) {
  const tones = {
    neutral: "text-foreground",
    accent: "text-accent",
    terracotta: "text-terracotta",
    success: "text-success",
    danger: "text-danger",
  };
  return (
    <Card>
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`rise relative max-h-[85vh] w-full ${wide ? "max-w-2xl" : "max-w-md"} overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-foreground">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-panel p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            active === t.id ? "bg-accent text-ink" : "text-muted hover:bg-panel-2 hover:text-foreground"
          }`}
        >
          {t.label}
          {t.count !== undefined ? <span className="ml-1.5 opacity-70">({t.count})</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">{text}</div>;
}

export function Bar({ value, max, color = "bg-accent" }: { value: number; max: number; color?: string }) {
  const h = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 8;
  return (
    <div className="flex h-full w-full items-end">
      <div className={`w-full rounded-t ${color}`} style={{ height: `${h}%` }} />
    </div>
  );
}

export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="danger">Cancelled</Badge>
      </div>
    );
  }
  const idx = ORDER_STATUS_FLOW.findIndex((s) => s.status === status);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {ORDER_STATUS_FLOW.map((s, i) => (
        <div key={s.status} className="flex items-center gap-1">
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
              i <= idx ? "bg-accent text-ink" : "bg-panel-2 text-muted"
            }`}
          >
            {i <= idx ? "✓" : i + 1}
          </div>
          <span className={`text-xs ${i <= idx ? "text-foreground" : "text-muted"}`}>{s.label}</span>
          {i < ORDER_STATUS_FLOW.length - 1 && (
            <div className={`h-0.5 w-4 rounded ${i < idx ? "bg-accent" : "bg-panel-2"}`} />
          )}
        </div>
      ))}
    </div>
  );
}