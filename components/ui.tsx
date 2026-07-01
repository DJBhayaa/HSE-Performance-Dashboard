"use client";

import React, { useEffect, useRef, useState } from "react";

export const numberFmt = (v: number) => v.toLocaleString("en-US");

// ── Section header ───────────────────────────────────────────────────────────
export function SectionTitle({ kicker, title, hint }: { kicker?: string; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {kicker && <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand">{kicker}</div>}
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
      </div>
      {hint && <p className="hidden text-xs text-slate-500 sm:block">{hint}</p>}
    </div>
  );
}

// ── Panel wrapper ────────────────────────────────────────────────────────────
export function Panel({
  title,
  subtitle,
  children,
  className = "",
  action,
  dense,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <div className={`card animate-fadeup ${dense ? "p-3" : "p-4"} ${className}`}>
      <div className={`flex items-start justify-between gap-2 ${dense ? "mb-1.5" : "mb-3"}`}>
        <div>
          <h3 className={`font-semibold text-slate-800 ${dense ? "text-xs" : "text-sm"}`}>{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export interface MonthDelta {
  pct: number | null; // null when prior month is 0 (can't compute %)
  dir: "up" | "down" | "flat";
  good: boolean; // true → green, false → red
  label: string; // e.g. "vs Apr 2026"
}

/** Build a month-over-month delta. lowerIsBetter flips the good/bad colouring. */
export function monthDelta(curr: number, prev: number | undefined, lowerIsBetter: boolean, label: string): MonthDelta | undefined {
  if (prev === undefined) return undefined;
  const diff = curr - prev;
  const dir = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  const good = diff === 0 ? true : lowerIsBetter ? diff < 0 : diff > 0;
  const pct = prev === 0 ? null : Math.round((diff / Math.abs(prev)) * 100);
  return { pct, dir, good, label };
}

// ── KPI stat card (photo style: icon + value + label + optional MoM delta) ───
export function StatCard({
  label,
  value,
  unit,
  icon,
  orange,
  accent = "#F15A22",
  delta,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  orange?: boolean;
  accent?: string;
  delta?: MonthDelta;
}) {
  return (
    <div className="card card-hover animate-fadeup flex flex-col items-center justify-center px-3 py-3.5 text-center">
      {icon && (
        <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "#FFF1EA", color: accent }}>
          {icon}
        </div>
      )}
      <div className="flex items-baseline justify-center gap-1">
        <span className={`text-2xl font-extrabold tabular-nums ${orange ? "text-brand" : "text-slate-900"}`}>{value}</span>
        {unit && <span className="text-[11px] font-medium text-slate-400">{unit}</span>}
      </div>
      <div className="mt-1 text-[11px] font-medium leading-tight text-slate-500">{label}</div>
      {delta && (
        <div className="mt-2 flex w-full items-center justify-between gap-1 border-t border-line pt-1.5 text-[10px]">
          <span className="text-slate-400">{delta.label}</span>
          <span className={`inline-flex items-center gap-0.5 font-bold ${delta.dir === "flat" ? "text-slate-400" : delta.good ? "text-emerald-600" : "text-red-600"}`}>
            {delta.pct == null ? "—" : `${Math.abs(delta.pct)}%`}
            <span>{delta.dir === "up" ? "↑" : delta.dir === "down" ? "↓" : "→"}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────────────────────────
export function Sparkline({ data, color = "#F15A22", height = 28 }: { data: number[]; color?: string; height?: number }) {
  const W = 88;
  const H = height;
  if (!data.length) return <div style={{ height: H }} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = data.length > 1 ? W / (data.length - 1) : 0;
  const pts = data.map((v, i) => [i * step, H - 3 - ((v - min) / span) * (H - 6)] as const);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={W} height={H} className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.2} fill={color} />
    </svg>
  );
}

// ── Segmented toggle ─────────────────────────────────────────────────────────
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-0.5 shadow-sm">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
            value === o.value ? "bg-brand text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Logo with graceful fallback ──────────────────────────────────────────────
export function Logo({
  src,
  fallbackSrc,
  alt,
  fallback,
  className = "h-11 w-auto",
}: {
  src: string;
  fallbackSrc?: string;
  alt: string;
  fallback: string;
  className?: string;
}) {
  // Try each source in turn (e.g. PNG → SVG), then a text badge.
  const sources = [src, fallbackSrc].filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLImageElement>(null);
  // Catch the SSR case where the <img>'s error fired before React hydrated:
  // if the current source is already loaded-but-broken, advance to the next.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0 && idx < sources.length) setIdx((i) => i + 1);
  });
  if (idx >= sources.length) {
    return (
      <div className="flex h-11 items-center rounded-md border border-line bg-white px-3 text-[11px] font-bold tracking-wide text-slate-700">
        {fallback}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={sources[idx]} alt={alt} className={`${className} object-contain`} onError={() => setIdx((i) => i + 1)} />;
}
