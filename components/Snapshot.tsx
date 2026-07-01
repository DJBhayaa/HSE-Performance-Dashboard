"use client";

import React, { forwardRef, useRef, useState } from "react";
import type { Metrics, MonthlyPoint } from "@/lib/metrics";
import { monthLong } from "@/lib/metrics";
import { Donut, ManhoursTrend, MonthlyBars, MonthlyLines, MonthlyArea } from "./charts/Charts";
import { SafetyTriangle } from "./charts/SafetyTriangle";
import { Logo } from "./ui";

const int = (n: number) => Math.round(n).toLocaleString();
const r2 = (n: number) => n.toFixed(2);

const KPI_DEFS: { label: string; get: (h: Metrics["headline"]) => number; fmt: (n: number) => string; orange?: boolean }[] = [
  { label: "First Aid", get: (h) => h.firstAidYtd, fmt: int },
  { label: "LTA", get: (h) => h.ltaYtd, fmt: int },
  { label: "Lost Work Days", get: (h) => h.lostWorkDaysYtd, fmt: int },
  { label: "Global Freq", get: (h) => h.globalFreqRateYtd, fmt: r2, orange: true },
  { label: "LTA Freq", get: (h) => h.ltaFreqRateYtd, fmt: r2 },
  { label: "LTA Severity", get: (h) => h.ltaSeverityRateYtd, fmt: r2, orange: true },
  { label: "Near Miss", get: (h) => h.nearMissYtd, fmt: int },
  { label: "Road Traffic", get: (h) => h.roadTrafficYtd, fmt: int },
  { label: "MRA", get: (h) => h.majorRiskAccidentYtd, fmt: int },
  { label: "MRN", get: (h) => h.majorRiskNearMissYtd, fmt: int },
  { label: "Manhours", get: (h) => h.manhoursYtd, fmt: int },
  { label: "Severe", get: (h) => h.severeYtd, fmt: int },
];

function Tile({ label, value, orange }: { label: string; value: string; orange?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-white px-1 py-1 text-center">
      <span className={`text-lg font-extrabold tabular-nums ${orange ? "text-brand" : "text-slate-900"}`}>{value}</span>
      <span className="text-[9px] font-medium leading-tight text-slate-500">{label}</span>
    </div>
  );
}

function Box({ title, h, children }: { title: string; h: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-white p-2" style={{ height: h }}>
      <div className="mb-0.5 text-[11px] font-semibold text-slate-700">{title}</div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

/** Fixed 1920×1080 (16:9) presentation board — EVERY dashboard KPI + chart. */
export const SnapshotBoard = forwardRef<HTMLDivElement, { m: Metrics }>(function SnapshotBoard({ m }, ref) {
  const data = m.monthly.map((p: MonthlyPoint) => ({
    month: p.label,
    manhours: p.manhours,
    manpower: p.manpower,
    propertyDamage: p.propertyDamage,
    lostWorkDays: p.lostWorkDays,
    lwdCases: p.lta,
    firstAid: p.firstAid,
    mra: p.majorRiskAccident,
    mrn: p.majorRiskNearMiss,
    severe: p.severe,
    nearMiss: p.nearMiss,
    ltaFreq: Number(p.ltaFreq.toFixed(2)),
    ltaSeverity: Number(p.ltaSeverity.toFixed(2)),
    globalFreq: Number(p.globalFreq.toFixed(2)),
  }));
  const other = [
    { name: "Leadership Visits", value: m.leading.leadershipVisits },
    { name: "HS Meetings", value: m.leading.hsMeetings },
    { name: "Mass Briefings", value: m.leading.massBriefings },
    { name: "Campaigns", value: m.leading.campaigns },
  ].filter((d) => d.value > 0);
  const drillAudit = [
    { name: "Mock Drills", value: m.leading.drills },
    { name: "Safety Alerts", value: m.leading.safetyAlerts },
    { name: "HS Audits", value: m.leading.audits },
  ].filter((d) => d.value > 0);
  const stopGo = [
    { name: "Stop & Go HSE", value: m.leading.stopGoHse, color: "#F15A22" },
    { name: "Stop & Go Prod", value: m.leading.stopGoProd, color: "#2563EB" },
  ];

  const RH = 206; // chart row height
  const CH = 150; // inner chart height

  return (
    <div ref={ref} style={{ width: 1920, height: 1080 }} className="flex flex-col gap-2 bg-page p-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between rounded-lg border border-line bg-white px-4 py-1.5">
        <div className="flex items-center gap-3">
          <Logo src="/logos/primary-logo.png" fallbackSrc="/logos/primary-mark.svg" alt="QTC JV" fallback="QTC JV" className="h-10 w-auto" />
          <div>
            <div className="text-xl font-extrabold text-slate-900">H&amp;S Performance Dashboard</div>
            <div className="text-xs text-slate-500">
              QTC JV · Qiddiya Tennis Centre · {m.periodStart ? `${monthLong(m.periodStart)} – ${monthLong(m.periodEnd)}` : ""} (YTD)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Logo src="/logos/welovelife.png" fallbackSrc="/logos/welovelife.svg" alt="we love life" fallback="WE LOVE LIFE" className="h-9 w-auto" />
          <Logo src="/logos/secondary-logo.png" fallbackSrc="/logos/secondary-logo.svg" alt="Bouygues" fallback="BOUYGUES" className="h-9 w-auto" />
          <Logo src="/logos/almabani-logo.png" fallbackSrc="/logos/almabani-mark.svg" alt="Almabani" fallback="ALMABANI" className="h-9 w-auto" />
        </div>
      </div>

      {/* KPI strip (12) */}
      <div className="grid grid-cols-12 gap-2" style={{ height: 66 }}>
        {KPI_DEFS.map((k) => (
          <Tile key={k.label} label={k.label} value={k.fmt(k.get(m.headline))} orange={k.orange} />
        ))}
      </div>

      {/* Row 1: Manhours(2) · Triangle · Rates */}
      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-2">
          <Box title="Manhours vs Manpower" h={RH}>
            <ManhoursTrend data={data} />
          </Box>
        </div>
        <Box title="Heinrich Safety Triangle" h={RH}>
          <SafetyTriangle levels={m.safetyTriangle} />
        </Box>
        <Box title="Frequency & Severity Rates" h={RH}>
          <MonthlyLines
            data={data}
            height={CH}
            series={[
              { key: "ltaFreq", name: "LTA Freq", color: "#2563EB" },
              { key: "ltaSeverity", name: "LTA Sev", color: "#D97706" },
              { key: "globalFreq", name: "Global", color: "#F15A22" },
            ]}
          />
        </Box>
      </div>

      {/* Row 2: Property Damage · Lost Work Days · First Aid · MRA */}
      <div className="grid grid-cols-4 gap-2">
        <Box title="Property Damage" h={RH}><MonthlyBars data={data} height={CH} series={[{ key: "propertyDamage", name: "Property Damage", color: "#F15A22" }]} /></Box>
        <Box title="Lost Work Days" h={RH}><MonthlyBars data={data} height={CH} series={[{ key: "lostWorkDays", name: "Lost Work Days", color: "#C2410C" }]} /></Box>
        <Box title="First Aid Cases" h={RH}><MonthlyArea data={data} height={CH} dataKey="firstAid" name="First Aid" color="#FBBF24" /></Box>
        <Box title="Major Risk Accident (MRA)" h={RH}><MonthlyBars data={data} height={CH} series={[{ key: "mra", name: "MRA", color: "#EF4444" }]} /></Box>
      </div>

      {/* Row 3: MRN · Lost Work Day Cases · Severe · Near Miss */}
      <div className="grid grid-cols-4 gap-2">
        <Box title="Major Risk Near Miss (MRN)" h={RH}><MonthlyLines data={data} height={CH} series={[{ key: "mrn", name: "MRN", color: "#2563EB" }]} /></Box>
        <Box title="Lost Work Day Cases" h={RH}><MonthlyBars data={data} height={CH} series={[{ key: "lwdCases", name: "Cases", color: "#D97706" }]} /></Box>
        <Box title="Severe Accident" h={RH}><MonthlyLines data={data} height={CH} series={[{ key: "severe", name: "Severe", color: "#B91C1C" }]} /></Box>
        <Box title="Near Miss" h={RH}><MonthlyArea data={data} height={CH} dataKey="nearMiss" name="Near Miss" color="#2563EB" /></Box>
      </div>

      {/* Row 4: 4 pies */}
      <div className="grid grid-cols-4 gap-2">
        <Box title="Trainings" h={RH}><Donut data={m.trainingSplit} centerLabel="Sessions" height={CH} /></Box>
        <Box title="Other Indicators" h={RH}><Donut data={other} centerLabel="Activities" height={CH} /></Box>
        <Box title="Drills · Alerts · Audits" h={RH}><Donut data={drillAudit} centerLabel="Total" height={CH} /></Box>
        <Box title="Stop & Go — HSE vs Prod" h={RH}><Donut data={stopGo} centerLabel="Stop & Go" height={CH} /></Box>
      </div>
    </div>
  );
});

/** Button + off-screen board that exports a 1920×1080 (16:9) PNG. */
export function SnapshotButton({ m }: { m: Metrics }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    if (!boardRef.current) return;
    setBusy(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(boardRef.current, {
        backgroundColor: "#F4F5F7",
        scale: 2,
        width: 1920,
        height: 1080,
        windowWidth: 1920,
        windowHeight: 1080,
        useCORS: true,
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "HS-Performance-Dashboard-16x9.png";
      a.click();
    } catch (e) {
      console.error("Snapshot failed", e);
      alert("Snapshot export failed — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={handleExport}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h3l2-2h6l2 2h3v12H4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {busy ? "Generating…" : "Export 16:9 Snapshot"}
      </button>

      <div style={{ position: "fixed", left: -30000, top: 0, pointerEvents: "none" }} aria-hidden>
        <SnapshotBoard ref={boardRef} m={m} />
      </div>
    </>
  );
}
