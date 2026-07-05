"use client";

import React, { useEffect, useMemo, useState } from "react";
import { defaultDataset } from "@/lib/data";
import { buildMetrics, monthLong, type Metrics, type MonthlyPoint } from "@/lib/metrics";
import { loadWorkbookFile } from "@/lib/parse";
import type { Dataset } from "@/lib/types";
import { StatCard, Panel, SectionTitle, Segmented, Logo, numberFmt, monthDelta } from "./ui";
import { Icons } from "./icons";
import { Donut, HBar, ManhoursTrend, MonthlyBars, MonthlyLines, MonthlyArea } from "./charts/Charts";
import { SafetyTriangle } from "./charts/SafetyTriangle";
import { IncidentTable } from "./Tables";
import { Violators } from "./Violators";
import { ZoneKPIs } from "./ZoneKPIs";
import { DataEntry, type SaveResult } from "./DataEntry";
import { SnapshotButton } from "./Snapshot";
import { PROJECTS, emptyDataset, type Project } from "@/lib/projects";

const TABS = ["Dashboard", "Zone KPIs", "Violations", "Detailed", "Incident Log", "Data Entry"] as const;
type Tab = (typeof TABS)[number];

// Bump when deploying — lets you confirm which build is live (shown in the footer).
const APP_VERSION = "build 2026-07-04 · multi-project";

const int = (n: number) => Math.round(n).toLocaleString();
const r2 = (n: number) => n.toFixed(2);

const localKey = (projectId: string) => `hse-data-${projectId}`;

export default function Dashboard() {
  const [project, setProject] = useState<Project>(PROJECTS[0]);
  const [dataset, setDataset] = useState<Dataset>(defaultDataset);
  const [source, setSource] = useState<string>("loading");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("Dashboard");
  const [scrolled, setScrolled] = useState(false);

  const m = useMemo(() => buildMetrics(dataset), [dataset]);

  // Shrink the sticky header once the page is scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Load the selected project's data: cloud → this device → legacy workbook
  // file (Male project only) → bundled sample (Male) / empty (other projects).
  useEffect(() => {
    let cancelled = false;
    setSource("loading");
    setDirty(false);
    (async () => {
      try {
        const res = await fetch(`/api/data?project=${project.id}`, { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (j.dataset && !cancelled) {
            setDataset(j.dataset);
            setSource("cloud");
            return;
          }
        }
      } catch {}
      try {
        const raw = localStorage.getItem(localKey(project.id));
        if (raw && !cancelled) {
          setDataset(JSON.parse(raw));
          setSource("device");
          return;
        }
      } catch {}
      if (project.id === "qntc-male") {
        try {
          const { dataset: ds } = await loadWorkbookFile();
          if (!cancelled) {
            setDataset(ds);
            setSource("workbook-file");
          }
          return;
        } catch {}
        if (!cancelled) {
          setDataset(defaultDataset);
          setSource("bundled");
        }
        return;
      }
      if (!cancelled) {
        setDataset(emptyDataset());
        setSource("empty");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  // Every edit updates the live dashboard and is mirrored to this device.
  function handleChange(ds: Dataset) {
    setDataset(ds);
    setDirty(true);
    try {
      localStorage.setItem(localKey(project.id), JSON.stringify(ds));
    } catch {}
  }

  // Save to cloud storage; falls back to device-only when Blob isn't enabled.
  async function handleSave(pin?: string): Promise<SaveResult> {
    setSaving(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pin ? { "x-edit-pin": pin } : {}) },
        body: JSON.stringify({ project: project.id, dataset }),
      });
      if (res.ok) {
        setDirty(false);
        setSource("cloud");
        return { ok: true };
      }
      if (res.status === 401) return { ok: false, needPin: true };
      if (res.status === 501) {
        // Cloud storage not enabled — the localStorage mirror is the save.
        setDirty(false);
        setSource("device");
        return { ok: true, local: true };
      }
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j.error ?? `Save failed (${res.status}).` };
    } catch {
      return { ok: false, error: "Network error — please try again." };
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header band — sticky; shrinks on scroll but keeps all logos */}
      <div className={`bg-brandwash sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur transition-all ${scrolled ? "shadow-md" : ""}`}>
        <div className={`mx-auto max-w-[1440px] px-4 transition-all sm:px-6 ${scrolled ? "pt-2" : "pt-5"}`}>
          <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between ${scrolled ? "gap-1" : "gap-4"}`}>
            <div className="flex items-center gap-3">
              <Logo src="/logos/primary-logo.png" fallbackSrc="/logos/primary-mark.svg" alt="QTC JV" fallback="QTC JV" className={`${scrolled ? "h-8" : "h-12"} w-auto transition-all`} />
              <div>
                <h1 className={`font-extrabold leading-tight text-slate-900 transition-all ${scrolled ? "text-base sm:text-lg" : "text-xl sm:text-2xl"}`}>
                  H&amp;S Performance Dashboard
                </h1>
                <div className={`mt-0.5 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 ${scrolled ? "hidden sm:flex" : "flex"}`}>
                  <select
                    value={project.id}
                    onChange={(e) => setProject(PROJECTS.find((p) => p.id === e.target.value) ?? PROJECTS[0])}
                    className="rounded border border-line bg-white px-1.5 py-0.5 text-xs font-semibold text-brand focus:border-brand focus:outline-none"
                  >
                    {PROJECTS.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <span className="text-line">|</span>
                  <span className="rounded border border-line bg-white px-1.5 py-0.5 font-medium text-slate-700">
                    {m.periodStart ? `${monthLong(m.periodStart)} – ${monthLong(m.periodEnd)}` : "no data yet"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Logo src="/logos/welovelife.png" fallbackSrc="/logos/welovelife.svg" alt="We love life — committed to 0 severe accidents" fallback="WE LOVE LIFE" className={`${scrolled ? "h-8" : "h-11"} w-auto transition-all`} />
              <Logo src="/logos/secondary-logo.png" fallbackSrc="/logos/secondary-logo.svg" alt="Bouygues Construction" fallback="BOUYGUES" className={`${scrolled ? "h-8" : "h-11"} w-auto transition-all`} />
              <Logo src="/logos/almabani-logo.png" fallbackSrc="/logos/almabani-mark.svg" alt="Almabani" fallback="ALMABANI" className={`${scrolled ? "h-8" : "h-11"} w-auto transition-all`} />
            </div>
          </div>

          <nav className={`flex flex-wrap gap-1 transition-all ${scrolled ? "mt-1.5" : "mt-4"}`}>
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                  tab === t ? "bg-page text-brand shadow-[inset_0_2px_0_#F15A22]" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t === "Data Entry" ? "✎ Data Entry" : t}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        {tab === "Dashboard" && <Page1 m={m} />}
        {tab === "Zone KPIs" && <ZoneKPIs m={m} />}
        {tab === "Violations" && <Violators m={m} />}
        {tab === "Detailed" && <Detailed m={m} />}
        {tab === "Incident Log" && <IncidentLog m={m} />}
        {tab === "Data Entry" && (
          <DataEntry
            project={project}
            dataset={dataset}
            source={source}
            dirty={dirty}
            saving={saving}
            onChange={handleChange}
            onSave={handleSave}
          />
        )}

        <footer className="mt-10 border-t border-line pt-4 text-center text-[11px] text-slate-400">
          {project.name} — QTC JV · Bouygues Construction ·{" "}
          {{
            cloud: "data from cloud storage",
            device: "data saved on this device",
            "workbook-file": "data from the project workbook file",
            bundled: "built-in sample data",
            empty: "no data entered yet",
            loading: "loading…",
          }[source] ?? source}
          {dirty && <span className="ml-1 font-semibold text-amber-500">· unsaved changes</span>}
          <span className="ml-1 text-slate-300">· {APP_VERSION}</span>
        </footer>
      </div>
    </div>
  );
}

// ── KPI descriptors (the 12, in the order from the manager's layout) ─────────
interface KpiDesc {
  label: string;
  icon: React.ReactNode;
  ytd: number;
  month: (p: MonthlyPoint) => number;
  fmt: (n: number) => string;
  unit?: string;
  orange?: boolean;
  lower: boolean; // lower is better (down = green)?
}

function kpis(m: Metrics): KpiDesc[] {
  const h = m.headline;
  return [
    { label: "First Aid Cases", icon: Icons.firstAid, ytd: h.firstAidYtd, month: (p) => p.firstAid, fmt: int, lower: true },
    { label: "Lost Time Accident", icon: Icons.lostTime, ytd: h.ltaYtd, month: (p) => p.lta, fmt: int, lower: true },
    { label: "Lost Work Days", icon: Icons.days, ytd: h.lostWorkDaysYtd, month: (p) => p.lostWorkDays, fmt: int, lower: true },
    { label: "Global Frequency Rate", icon: Icons.gauge, ytd: h.globalFreqRateYtd, month: (p) => p.globalFreq, fmt: r2, orange: true, lower: true },
    { label: "LTA Frequency Rate", icon: Icons.gauge, ytd: h.ltaFreqRateYtd, month: (p) => p.ltaFreq, fmt: r2, lower: true },
    { label: "LTA Severity Rate", icon: Icons.severity, ytd: h.ltaSeverityRateYtd, month: (p) => p.ltaSeverity, fmt: r2, orange: true, lower: true },
    { label: "Near Miss", icon: Icons.nearMiss, ytd: h.nearMissYtd, month: (p) => p.nearMiss, fmt: int, lower: true },
    { label: "Road Traffic Accidents", icon: Icons.road, ytd: h.roadTrafficYtd, month: (p) => p.roadTraffic, fmt: int, lower: true },
    { label: "Major Risk Accident", icon: Icons.mra, ytd: h.majorRiskAccidentYtd, month: (p) => p.majorRiskAccident, fmt: int, lower: true },
    { label: "Major Risk Near Miss", icon: Icons.mrn, ytd: h.majorRiskNearMissYtd, month: (p) => p.majorRiskNearMiss, fmt: int, lower: true },
    { label: "Manhours", icon: Icons.hours, ytd: h.manhoursYtd, month: (p) => p.manhours, fmt: int, lower: false },
    { label: "Severe Accident", icon: Icons.severe, ytd: h.severeYtd, month: (p) => p.severe, fmt: int, lower: true },
  ];
}

function Page1({ m }: { m: Metrics }) {
  const [mode, setMode] = useState<"ytd" | "month">("ytd");
  const [monthIdx, setMonthIdx] = useState<number>(Math.max(0, m.monthly.length - 1));
  useEffect(() => setMonthIdx(Math.max(0, m.monthly.length - 1)), [m.monthly.length]);

  if (!m.ok) return <EmptyState />;

  // Clamp for reads: a smaller workbook can shrink m.monthly before the effect resets monthIdx.
  const safeIdx = Math.min(Math.max(0, monthIdx), m.monthly.length - 1);
  const sel = m.monthly[safeIdx];
  const cards = kpis(m);

  const data = m.monthly.map((p) => ({
    month: p.label,
    manhours: p.manhours,
    manpower: p.manpower,
    propertyDamage: p.propertyDamage,
    lostWorkDays: p.lostWorkDays,
    lwdCases: p.lta, // lost-work-day cases ≈ lost-time accidents
    firstAid: p.firstAid,
    mra: p.majorRiskAccident,
    mrn: p.majorRiskNearMiss,
    severe: p.severe,
    nearMiss: p.nearMiss,
    ltaFreq: Number(p.ltaFreq.toFixed(2)),
    ltaSeverity: Number(p.ltaSeverity.toFixed(2)),
    globalFreq: Number(p.globalFreq.toFixed(2)),
  }));

  const otherIndicators = [
    { name: "Leadership Visits", value: m.leading.leadershipVisits },
    { name: "HS Meetings", value: m.leading.hsMeetings },
    { name: "Mass Briefings", value: m.leading.massBriefings },
    { name: "HS Campaigns", value: m.leading.campaigns },
  ].filter((d) => d.value > 0);

  const drillAudit = [
    { name: "Mock Drills", value: m.leading.drills },
    { name: "Safety Alerts", value: m.leading.safetyAlerts },
    { name: "HS Audits", value: m.leading.audits },
  ].filter((d) => d.value > 0);

  const stopGo = [
    { name: "Stop & Go by HSE", value: m.leading.stopGoHse, color: "#F15A22" },
    { name: "Stop & Go by Production", value: m.leading.stopGoProd, color: "#2563EB" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI band */}
      <section className="rounded-2xl border border-brand-ring/60 bg-brand-soft/60 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand">KPI Indicators</div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === "ytd" ? "Year to Date" : `Month — ${sel?.long ?? ""}`}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SnapshotButton m={m} />
            <Segmented
              options={[
                { label: "YTD", value: "ytd" },
                { label: "Current Month", value: "month" },
              ]}
              value={mode}
              onChange={setMode}
            />
            {mode === "month" && m.monthly.length > 0 && (
              <select
                value={safeIdx}
                onChange={(e) => setMonthIdx(Number(e.target.value))}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:border-brand focus:outline-none"
              >
                {m.monthly.map((p, i) => (
                  <option key={p.date} value={i}>{p.long}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map((c) => {
            const prev = safeIdx > 0 ? m.monthly[safeIdx - 1] : undefined;
            const delta =
              mode === "month" && sel
                ? monthDelta(c.month(sel), prev ? c.month(prev) : undefined, c.lower, prev ? `vs ${prev.label}` : "first month")
                : undefined;
            return (
              <StatCard
                key={c.label}
                label={c.label}
                value={c.fmt(mode === "ytd" ? c.ytd : sel ? c.month(sel) : 0)}
                unit={c.unit}
                icon={c.icon}
                orange={c.orange}
                delta={delta}
              />
            );
          })}
        </div>
        {mode === "month" && (
          <p className="mt-2 text-[11px] text-slate-500">
            ↑/↓ shows the change vs the previous month — <span className="font-semibold text-emerald-600">green = improving</span>,{" "}
            <span className="font-semibold text-red-600">red = worsening</span>.
          </p>
        )}
      </section>

      {/* Metric mini-charts */}
      <section>
        <SectionTitle kicker="Trends" title="Performance Charts" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Manhours vs Manpower" subtitle="Exposure vs headcount" className="lg:col-span-3">
            <ManhoursTrend data={data} />
          </Panel>
          <Panel title="Property Damage" dense><MonthlyBars data={data} series={[{ key: "propertyDamage", name: "Property Damage", color: "#F15A22" }]} height={190} /></Panel>
          <Panel title="Lost Work Days" dense><MonthlyBars data={data} series={[{ key: "lostWorkDays", name: "Lost Work Days", color: "#C2410C" }]} height={190} /></Panel>
          <Panel title="First Aid Cases" dense><MonthlyArea data={data} dataKey="firstAid" name="First Aid" color="#FBBF24" height={190} /></Panel>
          <Panel title="Major Risk Accident (MRA)" dense><MonthlyBars data={data} series={[{ key: "mra", name: "MRA", color: "#EF4444" }]} height={190} /></Panel>
          <Panel title="Major Risk Near Miss (MRN)" dense><MonthlyLines data={data} series={[{ key: "mrn", name: "MRN", color: "#2563EB" }]} height={190} /></Panel>
          <Panel title="Lost Work Day Cases" dense><MonthlyBars data={data} series={[{ key: "lwdCases", name: "Cases", color: "#D97706" }]} height={190} /></Panel>
          <Panel title="Severe Accident" dense><MonthlyLines data={data} series={[{ key: "severe", name: "Severe", color: "#B91C1C" }]} height={190} /></Panel>
          <Panel title="Near Miss" dense><MonthlyArea data={data} dataKey="nearMiss" name="Near Miss" color="#2563EB" height={190} /></Panel>
        </div>
      </section>

      {/* Pies + triangle + rates */}
      <section>
        <SectionTitle kicker="Distribution & Leading Indicators" title="Proactive HSE Effort" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Panel title="Trainings" subtitle="Induction vs task-specific" dense><Donut data={m.trainingSplit} centerLabel="Sessions" height={200} /></Panel>
          <Panel title="Other Indicators" subtitle="Engagement activities" dense><Donut data={otherIndicators} centerLabel="Activities" height={200} /></Panel>
          <Panel title="Drills · Alerts · Audits" subtitle="Assurance activity" dense><Donut data={drillAudit} centerLabel="Total" height={200} /></Panel>
          <Panel title="Stop & Go — HSE vs Production" subtitle="Interventions" dense><Donut data={stopGo} centerLabel="Stop & Go" height={200} /></Panel>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Heinrich Safety Triangle" subtitle="Severity pyramid (YTD)">
            <SafetyTriangle levels={m.safetyTriangle} />
          </Panel>
          <Panel title="Frequency & Severity Rates" subtitle="LTA Freq · LTA Severity · Global Freq — per million hours">
            <MonthlyLines
              data={data}
              series={[
                { key: "ltaFreq", name: "LTA Freq Rate", color: "#2563EB" },
                { key: "ltaSeverity", name: "LTA Severity Rate", color: "#D97706" },
                { key: "globalFreq", name: "Global Freq Rate", color: "#F15A22" },
              ]}
              height={320}
            />
          </Panel>
        </div>
      </section>
    </div>
  );
}

function Detailed({ m }: { m: Metrics }) {
  if (!m.ok) return <EmptyState />;
  const data = m.monthly.map((p) => ({
    month: p.label,
    manhours: p.manhours,
    manpower: p.manpower,
    firstAid: p.firstAid,
    nearMiss: p.nearMiss,
    severe: p.severe,
    inductions: p.inductions,
    taskSpecific: p.taskSpecific,
    stopGo: p.stopGo,
    audits: p.audits,
    leadership: p.leadership,
    violations: p.violations,
  }));

  return (
    <div className="space-y-8">
      <SectionTitle kicker="Deep Dive" title="Detailed Analytics" hint="Everything, broken down" />

      <section>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat label="Inductions" value={m.leading.inductions} />
          <MiniStat label="Task-Specific" value={m.leading.taskSpecific} />
          <MiniStat label="Leadership Visits" value={m.leading.leadershipVisits} />
          <MiniStat label="HS Meetings" value={m.leading.hsMeetings} />
          <MiniStat label="Stop & Go" value={m.leading.stopGoHse + m.leading.stopGoProd} />
          <MiniStat label="Mock Drills" value={m.leading.drills} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Manhours & Manpower" subtitle="Exposure vs headcount"><ManhoursTrend data={data} /></Panel>
        <Panel title="Incidents by Month" subtitle="First aid · near miss · severe">
          <MonthlyBars
            data={data}
            series={[
              { key: "firstAid", name: "First Aid", color: "#FBBF24" },
              { key: "nearMiss", name: "Near Miss", color: "#2563EB" },
              { key: "severe", name: "Severe", color: "#EF4444" },
            ]}
          />
        </Panel>
        <Panel title="Training Delivered" subtitle="Induction vs task-specific">
          <MonthlyBars
            data={data}
            series={[
              { key: "inductions", name: "Induction", color: "#F15A22" },
              { key: "taskSpecific", name: "Task Specific", color: "#2563EB" },
            ]}
          />
        </Panel>
        <Panel title="Assurance & Intervention" subtitle="Stop & Go · audits · leadership">
          <MonthlyLines
            data={data}
            series={[
              { key: "stopGo", name: "Stop & Go", color: "#F15A22" },
              { key: "leadership", name: "Leadership", color: "#7C3AED" },
            ]}
          />
        </Panel>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Incidents by Category" subtitle="All logged events"><Donut data={m.incidentsByCategory} centerLabel="Incidents" /></Panel>
        <Panel title="Violations by Company" subtitle="Repeat-offender view"><HBar data={m.violationsByCompany} color="#F15A22" /></Panel>
        <Panel title="Top Violation Types" subtitle="Most frequent unsafe acts"><HBar data={m.violationsByType} color="#D97706" labelWidth={150} maxLabel={22} /></Panel>
      </section>

      {/* Monthly KPI table */}
      <section>
        <div className="card overflow-hidden">
          <div className="border-b border-line p-4">
            <h3 className="text-sm font-semibold text-slate-800">Monthly KPI Register</h3>
            <p className="text-[11px] text-slate-400">Every active month, side by side</p>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-2 py-3 text-right">Manhours</th>
                  <th className="px-2 py-3 text-right">Manpower</th>
                  <th className="px-2 py-3 text-right">First Aid</th>
                  <th className="px-2 py-3 text-right">Near Miss</th>
                  <th className="px-2 py-3 text-right">MRA</th>
                  <th className="px-2 py-3 text-right">MRN</th>
                  <th className="px-2 py-3 text-right">Severe</th>
                  <th className="px-2 py-3 text-right">Violations</th>
                  <th className="px-2 py-3 text-right">Global Freq</th>
                </tr>
              </thead>
              <tbody>
                {m.monthly.map((p) => (
                  <tr key={p.date} className="border-t border-line hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-700">{p.long}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{int(p.manhours)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{int(p.manpower)}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{p.firstAid}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{p.nearMiss}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{p.majorRiskAccident}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{p.majorRiskNearMiss}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{p.severe}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-slate-600">{p.violations}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums font-semibold text-brand">{r2(p.globalFreq)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function IncidentLog({ m }: { m: Metrics }) {
  const riskCats = m.incidentMajorRiskByMonth.length
    ? (Object.keys(m.incidentMajorRiskByMonth[0]).filter((k) => k !== "month") as string[])
    : [];
  const riskColors = ["#F15A22", "#2563EB", "#F59E0B", "#10B981", "#7C3AED", "#EF4444"];
  return (
    <div className="space-y-6">
      <SectionTitle kicker="Accidents & Events" title="Incident / Accident Register" hint="Major-risk analysis + full event log" />

      {/* Major Risk category charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Incidents by Major Risk Category" subtitle="Excludes 'Not Applicable'">
          <Donut data={m.incidentsByMajorRisk} centerLabel="Major Risk" height={260} />
        </Panel>
        <Panel title="Incidents by Category" subtitle="First aid · near miss · severe">
          <Donut data={m.incidentsByCategory} centerLabel="Incidents" height={260} />
        </Panel>
        <Panel title="Incidents by Zone / Area" subtitle="Where events occur">
          <HBar data={m.incidentsByZone} color="#7C3AED" height={260} labelWidth={110} maxLabel={16} />
        </Panel>
      </div>

      <Panel title="Major Risk Categories by Month" subtitle="Work at height · lifting · hazardous energies · stability">
        <MonthlyBars
          data={m.incidentMajorRiskByMonth}
          series={riskCats.map((c, i) => ({ key: c, name: c, color: riskColors[i % riskColors.length] }))}
          height={260}
        />
      </Panel>

      <IncidentTable rows={m.incidentRows} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M3 5h18M3 12h18M3 19h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p className="text-base font-semibold text-slate-800">No data for this project yet</p>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Open <b className="text-brand">✎ Data Entry</b> to add your first month's figures, or import an
          existing Excel workbook there.
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card animate-fadeup px-3 py-2.5">
      <div className="text-lg font-bold tabular-nums text-slate-900">{numberFmt(value)}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
