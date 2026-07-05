"use client";

// In-dashboard data entry: monthly KPIs, incidents, violations and zone KPIs
// are edited here, saved to cloud storage (Vercel Blob) — or to this device
// when cloud storage isn't enabled — and exported to Excel each month.

import React, { useMemo, useRef, useState } from "react";
import type { Dataset, Incident, MonthKpi, Violation, ZoneKpiRow } from "@/lib/types";
import { monthLong } from "@/lib/metrics";
import {
  ALL_ZONE_METRICS as METRIC_ORDER_HINT,
  MONTHLY_MAIN_FIELDS,
  MONTHLY_HS_FIELDS,
  MONTH_KEYS,
  emptyMonth,
  nextMonthIso,
  zoneRowsFor,
  type Project,
} from "@/lib/projects";
import { exportWorkbook } from "@/lib/exportExcel";
import { parseWorkbook } from "@/lib/parse";
import { Panel, SectionTitle } from "./ui";

export type SaveResult = { ok: boolean; needPin?: boolean; local?: boolean; error?: string };

const SECTIONS = ["Monthly KPIs", "Incidents", "Violations", "Zone KPIs", "Import / Export"] as const;
type Section = (typeof SECTIONS)[number];

const inputCls =
  "w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none";
const btnPrimary =
  "rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50";
const btnGhost =
  "rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand hover:text-brand disabled:opacity-50";

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const monthOf = (dateIso: string): string => (dateIso ? `${dateIso.slice(0, 7)}-01` : "");

export function DataEntry({
  project,
  dataset,
  source,
  dirty,
  saving,
  onChange,
  onSave,
}: {
  project: Project;
  dataset: Dataset;
  source: string;
  dirty: boolean;
  saving: boolean;
  onChange: (ds: Dataset) => void;
  onSave: (pin?: string) => Promise<SaveResult>;
}) {
  const [section, setSection] = useState<Section>("Monthly KPIs");
  const [needPin, setNeedPin] = useState(false);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "warn" | "err"; text: string } | null>(null);

  async function save() {
    setMsg(null);
    const res = await onSave(needPin ? pin : undefined);
    if (res.ok) {
      setNeedPin(false);
      setMsg(
        res.local
          ? { kind: "warn", text: "Saved on this device only — enable Vercel Blob storage so the whole team sees it (see HOW-TO-DEPLOY.md)." }
          : { kind: "ok", text: "Saved to cloud storage — everyone now sees the latest data." }
      );
    } else if (res.needPin) {
      setNeedPin(true);
      setMsg({ kind: "err", text: pin ? "Incorrect edit PIN." : "This dashboard requires an edit PIN to save." });
    } else {
      setMsg({ kind: "err", text: res.error ?? "Save failed." });
    }
  }

  const sourceLabel: Record<string, string> = {
    cloud: "cloud storage",
    device: "this device",
    "workbook-file": "project workbook file",
    bundled: "built-in data",
    empty: "no data yet",
    loading: "loading…",
  };

  return (
    <div className="space-y-5">
      <SectionTitle kicker="Data Management" title={`Data Entry — ${project.short}`} hint="Enter data here, save, download Excel monthly" />

      {/* Save bar */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <span className="text-xs text-slate-500">
          Source: <b className="text-slate-800">{sourceLabel[source] ?? source}</b>
        </span>
        {dirty && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">unsaved changes</span>}
        <div className="ml-auto flex items-center gap-2">
          {needPin && (
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Edit PIN"
              className="w-28 rounded-md border border-line bg-white px-2 py-1.5 text-xs focus:border-brand focus:outline-none"
            />
          )}
          <button onClick={save} disabled={saving || !dirty} className={btnPrimary}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
        {msg && (
          <p
            className={`w-full rounded-lg border px-3 py-2 text-xs ${
              msg.kind === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : msg.kind === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {msg.text}
          </p>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
              section === s ? "bg-brand text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {section === "Monthly KPIs" && <MonthlyEditor dataset={dataset} onChange={onChange} />}
      {section === "Incidents" && <IncidentsEditor dataset={dataset} onChange={onChange} />}
      {section === "Violations" && <ViolationsEditor dataset={dataset} onChange={onChange} />}
      {section === "Zone KPIs" && <ZoneEditor dataset={dataset} onChange={onChange} />}
      {section === "Import / Export" && <ImportExport project={project} dataset={dataset} onChange={onChange} />}
    </div>
  );
}

/* ── Monthly KPIs ───────────────────────────────────────────────────────────── */
function MonthlyEditor({ dataset, onChange }: { dataset: Dataset; onChange: (ds: Dataset) => void }) {
  const months = dataset.kpiMonthly;
  const [idx, setIdx] = useState(Math.max(0, months.length - 1));
  const safe = Math.min(idx, Math.max(0, months.length - 1));
  const row = months[safe];

  function addMonth() {
    const iso = nextMonthIso(dataset);
    const next = { ...dataset, kpiMonthly: [...months, emptyMonth(iso)] };
    onChange(next);
    setIdx(next.kpiMonthly.length - 1);
  }

  function setField(field: string, value: number) {
    const kpiMonthly = months.map((m, i) => (i === safe ? { ...m, [field]: value } : m));
    onChange({ ...dataset, kpiMonthly });
  }

  return (
    <Panel title="Monthly KPI figures" subtitle="One set of numbers per month — pick the month, type the values">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {months.length > 0 && (
          <select value={safe} onChange={(e) => setIdx(Number(e.target.value))} className={`${inputCls} w-auto`}>
            {months.map((m, i) => (
              <option key={String(m.Date)} value={i}>
                {monthLong(String(m.Date))}
              </option>
            ))}
          </select>
        )}
        <button onClick={addMonth} className={btnGhost}>＋ Add {monthLong(nextMonthIso(dataset))}</button>
      </div>

      {!row ? (
        <p className="text-sm text-slate-500">No months yet — click “Add” to create the first month.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FieldGroup title="Hours, manpower & incident counts" fields={MONTHLY_MAIN_FIELDS} row={row} setField={setField} />
          <FieldGroup title="Trainings & H&S activities" fields={MONTHLY_HS_FIELDS} row={row} setField={setField} />
        </div>
      )}
    </Panel>
  );
}

function FieldGroup({
  title,
  fields,
  row,
  setField,
}: {
  title: string;
  fields: string[];
  row: MonthKpi;
  setField: (f: string, v: number) => void;
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-brand">{title}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {fields.map((f) => (
          <label key={f} className="text-[11px] font-medium text-slate-500">
            {f}
            <input
              type="number"
              min={0}
              value={num(row[f])}
              onChange={(e) => setField(f, Number(e.target.value) || 0)}
              className={`${inputCls} mt-0.5`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/* ── Incidents ──────────────────────────────────────────────────────────────── */
const INCIDENT_CATEGORIES = ["First Aid", "Near Miss", "Severe Accident", "Property Damage", "Road Traffic Accident", "Dangerous Occurance", "Fatality"];
const MAJOR_RISKS = ["Not Applicable", "Work At Height", "Lifting", "Hazardous Energies", "Stability", "Confined Space", "Electrical", "Excavation", "Traffic"];
const SEVERITIES = ["Not Applicable", "MRN", "MRA"];

const blankIncident = (): Partial<Incident> => ({
  "Incident Date": "",
  "Primary Category": "Near Miss",
  "Event Severity": "Not Applicable",
  "Major Risk": "Not Applicable",
  "Zone / Area": "",
  "Reported By": "",
  "Days Lost": 0,
  "What Happened": "",
  "Immediate Actions": "",
  Classification: "Not Applicable",
});

function IncidentsEditor({ dataset, onChange }: { dataset: Dataset; onChange: (ds: Dataset) => void }) {
  const [editIdx, setEditIdx] = useState<number | null>(null); // null = closed, -1 = new
  const [form, setForm] = useState<Partial<Incident>>(blankIncident());

  function open(i: number | -1) {
    setForm(i === -1 ? blankIncident() : { ...dataset.incidents[i] });
    setEditIdx(i);
  }

  function commit() {
    if (!form["Incident Date"] || !form["Primary Category"]) return;
    const rec = {
      ...form,
      Month: monthOf(String(form["Incident Date"])),
      "Days Lost": num(form["Days Lost"]),
    } as Incident;
    let incidents: Incident[];
    if (editIdx === -1) {
      const n = dataset.incidents.length + 1;
      incidents = [...dataset.incidents, { ...rec, Incident_ID: `INC-${String(n).padStart(3, "0")}` }];
    } else {
      incidents = dataset.incidents.map((it, i) => (i === editIdx ? { ...it, ...rec } : it));
    }
    onChange({ ...dataset, incidents });
    setEditIdx(null);
  }

  function remove(i: number) {
    if (!confirm("Delete this incident?")) return;
    onChange({ ...dataset, incidents: dataset.incidents.filter((_, x) => x !== i) });
  }

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Panel
      title={`Incident / Accident Register (${dataset.incidents.length})`}
      subtitle="Add, edit or remove incidents"
      action={<button onClick={() => open(-1)} className={btnPrimary}>＋ Add incident</button>}
    >
      {editIdx !== null && (
        <div className="mb-4 rounded-xl border border-brand-ring bg-brand-soft/50 p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-brand">
            {editIdx === -1 ? "New incident" : `Edit ${dataset.incidents[editIdx]?.Incident_ID}`}
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-[11px] font-medium text-slate-500">Incident date
              <input type="date" value={String(form["Incident Date"] ?? "")} onChange={(e) => set("Incident Date", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Category
              <select value={String(form["Primary Category"])} onChange={(e) => set("Primary Category", e.target.value)} className={`${inputCls} mt-0.5`}>
                {INCIDENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-medium text-slate-500">Major risk
              <select value={String(form["Major Risk"])} onChange={(e) => set("Major Risk", e.target.value)} className={`${inputCls} mt-0.5`}>
                {MAJOR_RISKS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-medium text-slate-500">Event severity
              <select value={String(form["Event Severity"])} onChange={(e) => set("Event Severity", e.target.value)} className={`${inputCls} mt-0.5`}>
                {SEVERITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-medium text-slate-500">Zone / Area
              <input value={String(form["Zone / Area"] ?? "")} onChange={(e) => set("Zone / Area", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Reported by
              <input value={String(form["Reported By"] ?? "")} onChange={(e) => set("Reported By", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Days lost
              <input type="number" min={0} value={num(form["Days Lost"])} onChange={(e) => set("Days Lost", Number(e.target.value) || 0)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Classification
              <input value={String(form.Classification ?? "")} onChange={(e) => set("Classification", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="col-span-2 text-[11px] font-medium text-slate-500 sm:col-span-4">What happened
              <textarea rows={3} value={String(form["What Happened"] ?? "")} onChange={(e) => set("What Happened", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="col-span-2 text-[11px] font-medium text-slate-500 sm:col-span-4">Immediate actions taken
              <textarea rows={2} value={String(form["Immediate Actions"] ?? "")} onChange={(e) => set("Immediate Actions", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={commit} className={btnPrimary}>{editIdx === -1 ? "Add incident" : "Save incident"}</button>
            <button onClick={() => setEditIdx(null)} className={btnGhost}>Cancel</button>
          </div>
        </div>
      )}

      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
            <tr><th className="px-3 py-2">ID</th><th className="px-2 py-2">Date</th><th className="px-2 py-2">Category</th><th className="px-2 py-2">Major risk</th><th className="px-2 py-2">Zone</th><th className="px-2 py-2" /></tr>
          </thead>
          <tbody>
            {dataset.incidents.map((it, i) => (
              <tr key={`${it.Incident_ID}-${i}`} className="border-t border-line hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{it.Incident_ID}</td>
                <td className="px-2 py-2 text-slate-600">{String(it["Incident Date"] ?? "")}</td>
                <td className="px-2 py-2 text-slate-700">{it["Primary Category"]}</td>
                <td className="px-2 py-2 text-slate-500">{it["Major Risk"]}</td>
                <td className="px-2 py-2 text-slate-500">{it["Zone / Area"]}</td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => open(i)} className="mr-2 text-brand hover:underline">Edit</button>
                  <button onClick={() => remove(i)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {dataset.incidents.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No incidents recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ── Violations ─────────────────────────────────────────────────────────────── */
const VIO_CATEGORIES = ["Minor", "Major", "Critical"];
const VIO_ACTIONS = ["Verbal Warning", "1st Warning", "2nd Warning", "Final Warning", "Suspension", "Termination"];

const blankViolation = (): Partial<Violation> => ({
  "Iqama No.": "", Name: "", Company: "", Location: "", "Violation Type": "",
  Category: "Minor", Date: "", "Disciplinary Action": "1st Warning", Status: "Closed",
  Count: 1, "Reported By": "", Remarks: "",
});

function ViolationsEditor({ dataset, onChange }: { dataset: Dataset; onChange: (ds: Dataset) => void }) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Violation>>(blankViolation());

  function open(i: number | -1) {
    setForm(i === -1 ? blankViolation() : { ...dataset.violations[i] });
    setEditIdx(i);
  }

  function commit() {
    if (!form.Name || !form["Violation Type"] || !form.Date) return;
    const rec = { ...form, Month: monthOf(String(form.Date)), Count: num(form.Count) || 1 } as Violation;
    let violations: Violation[];
    if (editIdx === -1) {
      const sn = Math.max(0, ...dataset.violations.map((v) => num(v.SN))) + 1;
      violations = [...dataset.violations, { ...rec, SN: sn }];
    } else {
      violations = dataset.violations.map((v, i) => (i === editIdx ? { ...v, ...rec } : v));
    }
    onChange({ ...dataset, violations });
    setEditIdx(null);
  }

  function remove(i: number) {
    if (!confirm("Delete this violation?")) return;
    onChange({ ...dataset, violations: dataset.violations.filter((_, x) => x !== i) });
  }

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Panel
      title={`Violation Register (${dataset.violations.length})`}
      subtitle="Add, edit or remove violations"
      action={<button onClick={() => open(-1)} className={btnPrimary}>＋ Add violation</button>}
    >
      {editIdx !== null && (
        <div className="mb-4 rounded-xl border border-brand-ring bg-brand-soft/50 p-4">
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-brand">
            {editIdx === -1 ? "New violation" : `Edit violation #${dataset.violations[editIdx]?.SN}`}
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-[11px] font-medium text-slate-500">Date
              <input type="date" value={String(form.Date ?? "")} onChange={(e) => set("Date", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Worker name
              <input value={String(form.Name ?? "")} onChange={(e) => set("Name", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Iqama No.
              <input value={String(form["Iqama No."] ?? "")} onChange={(e) => set("Iqama No.", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Company
              <input value={String(form.Company ?? "")} onChange={(e) => set("Company", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Location
              <input value={String(form.Location ?? "")} onChange={(e) => set("Location", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Category
              <select value={String(form.Category)} onChange={(e) => set("Category", e.target.value)} className={`${inputCls} mt-0.5`}>
                {VIO_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-medium text-slate-500">Disciplinary action
              <select value={String(form["Disciplinary Action"])} onChange={(e) => set("Disciplinary Action", e.target.value)} className={`${inputCls} mt-0.5`}>
                {VIO_ACTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-[11px] font-medium text-slate-500">Status
              <select value={String(form.Status)} onChange={(e) => set("Status", e.target.value)} className={`${inputCls} mt-0.5`}>
                <option>Open</option><option>Closed</option>
              </select>
            </label>
            <label className="col-span-2 text-[11px] font-medium text-slate-500">Violation type / description
              <input value={String(form["Violation Type"] ?? "")} onChange={(e) => set("Violation Type", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Reported by
              <input value={String(form["Reported By"] ?? "")} onChange={(e) => set("Reported By", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
            <label className="text-[11px] font-medium text-slate-500">Remarks
              <input value={String(form.Remarks ?? "")} onChange={(e) => set("Remarks", e.target.value)} className={`${inputCls} mt-0.5`} />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={commit} className={btnPrimary}>{editIdx === -1 ? "Add violation" : "Save violation"}</button>
            <button onClick={() => setEditIdx(null)} className={btnGhost}>Cancel</button>
          </div>
        </div>
      )}

      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
            <tr><th className="px-3 py-2">#</th><th className="px-2 py-2">Date</th><th className="px-2 py-2">Name</th><th className="px-2 py-2">Company</th><th className="px-2 py-2">Violation</th><th className="px-2 py-2">Status</th><th className="px-2 py-2" /></tr>
          </thead>
          <tbody>
            {dataset.violations.map((v, i) => (
              <tr key={`${v.SN}-${i}`} className="border-t border-line hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-400">{v.SN}</td>
                <td className="px-2 py-2 text-slate-600">{String(v.Date ?? "")}</td>
                <td className="px-2 py-2 font-medium text-slate-800">{v.Name}</td>
                <td className="px-2 py-2 text-slate-500">{v.Company}</td>
                <td className="max-w-[280px] truncate px-2 py-2 text-slate-600">{v["Violation Type"]}</td>
                <td className="px-2 py-2 text-slate-500">{v.Status}</td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => open(i)} className="mr-2 text-brand hover:underline">Edit</button>
                  <button onClick={() => remove(i)} className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {dataset.violations.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">No violations recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ── Zone KPIs ──────────────────────────────────────────────────────────────── */
function ZoneEditor({ dataset, onChange }: { dataset: Dataset; onChange: (ds: Dataset) => void }) {
  const zones = useMemo(() => [...new Set(dataset.zoneKpi.map((z) => z.Zone))], [dataset.zoneKpi]);
  const metrics = useMemo(() => {
    const inData = [...new Set(dataset.zoneKpi.map((z) => z.Metric))];
    return inData.length ? inData : METRIC_ORDER_HINT;
  }, [dataset.zoneKpi]);
  const [monthKey, setMonthKey] = useState(MONTH_KEYS[new Date().getMonth()]);
  const [newZone, setNewZone] = useState("");

  function setValue(zone: string, metric: string, value: number) {
    const zoneKpi = dataset.zoneKpi.map((r) => {
      if (r.Zone !== zone || r.Metric !== metric) return r;
      const updated = { ...r, [monthKey]: value } as ZoneKpiRow;
      updated.Total = MONTH_KEYS.reduce((a, k) => a + num(updated[k]), 0);
      return updated;
    });
    onChange({ ...dataset, zoneKpi });
  }

  function setTarget(metric: string, value: number | null) {
    const zoneKpi = dataset.zoneKpi.map((r) => (r.Metric === metric ? { ...r, Target: value } : r));
    onChange({ ...dataset, zoneKpi });
  }

  function addZone() {
    const name = newZone.trim();
    if (!name || zones.includes(name)) return;
    onChange({ ...dataset, zoneKpi: [...dataset.zoneKpi, ...zoneRowsFor(name)] });
    setNewZone("");
  }

  const cellOf = (zone: string, metric: string) =>
    num(dataset.zoneKpi.find((r) => r.Zone === zone && r.Metric === metric)?.[monthKey]);
  const targetOf = (metric: string) => {
    const t = dataset.zoneKpi.find((r) => r.Metric === metric && r.Target != null)?.Target;
    return t == null ? "" : String(t);
  };

  return (
    <Panel title="Zone KPI grid" subtitle="Pick the month, then enter each zone's value per metric">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={monthKey} onChange={(e) => setMonthKey(e.target.value)} className={`${inputCls} w-auto`}>
          {MONTH_KEYS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <input value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder="New zone name…" className={`${inputCls} w-40`} />
          <button onClick={addZone} disabled={!newZone.trim()} className={btnGhost}>＋ Add zone</button>
        </div>
      </div>

      {zones.length === 0 ? (
        <p className="text-sm text-slate-500">No zones yet — add your first zone above (e.g. “Zone A”). Each zone gets the 14 standard metrics.</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2">Metric ({monthKey})</th>
                {zones.map((z) => <th key={z} className="px-2 py-2 text-center">{z}</th>)}
                <th className="px-2 py-2 text-center">Target /mo</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric} className="border-t border-line">
                  <td className="px-3 py-1.5 font-medium text-slate-700">{metric}</td>
                  {zones.map((z) => (
                    <td key={z} className="px-2 py-1.5 text-center">
                      <input
                        type="number"
                        min={0}
                        value={cellOf(z, metric)}
                        onChange={(e) => setValue(z, metric, Number(e.target.value) || 0)}
                        className="w-20 rounded-md border border-line bg-white px-2 py-1 text-center text-xs focus:border-brand focus:outline-none"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="number"
                      min={0}
                      value={targetOf(metric)}
                      placeholder="—"
                      onChange={(e) => setTarget(metric, e.target.value === "" ? null : Number(e.target.value) || 0)}
                      className="w-16 rounded-md border border-line bg-white px-2 py-1 text-center text-xs focus:border-brand focus:outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/* ── Import / Export ────────────────────────────────────────────────────────── */
function ImportExport({ project, dataset, onChange }: { project: Project; dataset: Dataset; onChange: (ds: Dataset) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string | null>(null);

  async function importFile(file: File) {
    setNote(null);
    try {
      const { dataset: ds, summary } = parseWorkbook(await file.arrayBuffer());
      onChange(ds);
      setNote(`Imported ${summary.months} months, ${summary.incidents} incidents, ${summary.violations} violations, ${summary.zoneRows} zone rows — review, then click “Save changes” above.`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not read that workbook.");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Download Excel" subtitle="Monthly export of everything entered for this project">
        <p className="mb-3 text-xs text-slate-500">
          Generates <b>QTC_HSE_Data_Workbook_{project.id}_&lt;date&gt;.xlsx</b> with the standard sheets
          (Main Data, H&amp;S, Accident logs, Violations, KPI Data). It can be re-imported here at any time,
          so it doubles as your backup.
        </p>
        <button onClick={() => exportWorkbook(dataset, project.id)} className={btnPrimary}>⬇ Download Excel workbook</button>
      </Panel>

      <Panel title="Import a workbook (one-time migration)" subtitle="Load an existing Excel into this project">
        <p className="mb-3 text-xs text-slate-500">
          Use this once to bring in an existing workbook — after importing, click <b>Save changes</b> so it's stored.
          It replaces this project's current data.
        </p>
        <button onClick={() => fileRef.current?.click()} className={btnGhost}>Choose .xlsx file…</button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ""; }} />
        {note && <p className="mt-3 rounded-lg border border-line bg-slate-50 px-3 py-2 text-xs text-slate-600">{note}</p>}
      </Panel>
    </div>
  );
}
