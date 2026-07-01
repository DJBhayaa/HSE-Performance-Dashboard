"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  ReferenceLine,
} from "recharts";

export const PALETTE = ["#F15A22", "#2563EB", "#F59E0B", "#10B981", "#EF4444", "#7C3AED", "#0EA5E9", "#64748B"];

const axis = { fontSize: 11, fill: "#64748B" };
const gridStroke = "rgba(15,23,42,0.07)";
const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

function TooltipBox({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <div className="mb-1 font-semibold text-slate-800">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-slate-600">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800 tabular-nums">
            {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

const legendText = (v: string) => <span className="text-xs text-slate-600">{v}</span>;

type Datum = { name: string; value: number; color?: string };

// ── Donut ────────────────────────────────────────────────────────────────────
export function Donut({ data, height = 240, centerLabel }: { data: Datum[]; height?: number; centerLabel?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="none">
            {data.map((d, i) => (
              <Cell key={i} fill={d.color ?? PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox />} />
          <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={legendText} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex -translate-y-5 flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900 tabular-nums">{total.toLocaleString()}</span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400">{centerLabel ?? "Total"}</span>
      </div>
    </div>
  );
}

// ── Horizontal bars ──────────────────────────────────────────────────────────
export function HBar({
  data,
  height = 240,
  color = "#F15A22",
  labelWidth = 110,
  maxLabel = 16,
}: {
  data: Datum[];
  height?: number;
  color?: string;
  labelWidth?: number;
  maxLabel?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={gridStroke} />
        <XAxis type="number" tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={axis}
          axisLine={false}
          tickLine={false}
          width={labelWidth}
          interval={0}
          tickFormatter={(v: string) => truncate(v, maxLabel)}
        />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(15,23,42,0.04)" }} />
        <Bar isAnimationActive={false} dataKey="value" radius={[0, 5, 5, 0]} barSize={16}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Manhours / manpower combo ────────────────────────────────────────────────
export function ManhoursTrend({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="mh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F15A22" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#F15A22" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
        <YAxis yAxisId="l" tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
        <YAxis yAxisId="r" orientation="right" tick={axis} axisLine={false} tickLine={false} />
        <Tooltip content={<TooltipBox />} />
        <Legend iconType="circle" iconSize={8} formatter={legendText} />
        <Area isAnimationActive={false} yAxisId="l" type="monotone" dataKey="manhours" name="Manhours" stroke="#F15A22" strokeWidth={2.5} fill="url(#mh)" />
        <Line isAnimationActive={false} yAxisId="r" type="monotone" dataKey="manpower" name="Manpower" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Generic monthly grouped bars ────────────────────────────────────────────
export function MonthlyBars({
  data,
  series,
  height = 280,
}: {
  data: any[];
  series: { key: string; name: string; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(15,23,42,0.04)" }} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} formatter={legendText} />}
        {series.map((s) => (
          <Bar isAnimationActive={false} key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} maxBarSize={26} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Monthly lines ────────────────────────────────────────────────────────────
export function MonthlyLines({
  data,
  series,
  height = 280,
}: {
  data: any[];
  series: { key: string; name: string; color: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<TooltipBox />} />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} formatter={legendText} />}
        {series.map((s) => (
          <Line isAnimationActive={false} key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.2} dot={{ r: 2 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Single-metric monthly area (used on page 1 mini charts) ──────────────────
export function MonthlyArea({
  data,
  dataKey,
  name,
  color = "#F15A22",
  height = 200,
}: {
  data: any[];
  dataKey: string;
  name: string;
  color?: string;
  height?: number;
}) {
  const id = `ar-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
        <Tooltip content={<TooltipBox />} />
        <Area isAnimationActive={false} type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2.2} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Zone monthly grouped bars (per-metric, one series per zone) ──────────────
export function ZoneMonthlyBars({
  data,
  zones,
  height = 220,
  target = null,
}: {
  data: any[];
  zones: string[];
  height?: number;
  target?: number | null;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(15,23,42,0.04)" }} />
        <Legend iconType="circle" iconSize={7} formatter={legendText} />
        {target != null && target > 0 && (
          <ReferenceLine
            y={target}
            stroke="#EF4444"
            strokeDasharray="5 4"
            strokeWidth={1.5}
            ifOverflow="extendDomain"
            label={{ value: "Target", position: "insideTopRight", fill: "#EF4444", fontSize: 9, fontWeight: 700 }}
          />
        )}
        {zones.map((z, i) => (
          <Bar isAnimationActive={false} key={z} dataKey={z} name={z} fill={PALETTE[i % PALETTE.length]} radius={[2, 2, 0, 0]} maxBarSize={18} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Zone group chart: grouped bars per zone + monthly Total trend curve ──────
export function ZoneGroupChart({
  data,
  zones,
  height = 300,
  barColor,
}: {
  data: any[];
  zones: string[];
  height?: number;
  barColor?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
        <CartesianGrid stroke={gridStroke} vertical={false} />
        <XAxis dataKey="month" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "rgba(15,23,42,0.04)" }} />
        <Legend iconType="circle" iconSize={8} formatter={legendText} />
        {zones.map((z, i) => (
          <Bar isAnimationActive={false} key={z} dataKey={z} name={z} fill={barColor ?? PALETTE[i % PALETTE.length]} fillOpacity={barColor ? 0.55 + i * 0.18 : 1} radius={[2, 2, 0, 0]} maxBarSize={28} />
        ))}
        <Line isAnimationActive={false} type="monotone" dataKey="Total" name="Monthly trend (all zones)" stroke="#0F172A" strokeWidth={2.5} dot={{ r: 3, fill: "#0F172A" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
