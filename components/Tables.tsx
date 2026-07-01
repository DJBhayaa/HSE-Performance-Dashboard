"use client";

import React, { useMemo, useState } from "react";
import type { Incident, Violation } from "@/lib/types";

const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Badge({ text, tone }: { text: string; tone: "good" | "warn" | "bad" | "info" | "muted" }) {
  const map: Record<string, string> = {
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    bad: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    muted: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-medium ${map[tone]}`}>{text}</span>
  );
}

const catTone = (c: string): "bad" | "warn" | "info" | "muted" => {
  if (/severe|fatal|lta|lost time/i.test(c)) return "bad";
  if (/first aid/i.test(c)) return "warn";
  if (/near miss/i.test(c)) return "info";
  return "muted";
};

const inputCls =
  "rounded-md border border-line bg-white px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none";

export function IncidentTable({ rows }: { rows: Incident[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const cats = useMemo(() => ["All", ...new Set(rows.map((r) => r["Primary Category"]))], [rows]);

  const filtered = rows.filter((r) => {
    const matchCat = cat === "All" || r["Primary Category"] === cat;
    const hay = `${r.Incident_ID} ${r["Zone / Area"]} ${r["What Happened"]} ${r["Major Risk"]}`.toLowerCase();
    return matchCat && hay.includes(q.toLowerCase());
  });

  return (
    <div className="card animate-fadeup overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        <h3 className="mr-auto text-sm font-semibold text-slate-800">
          Incident & Near-Miss Log
          <span className="ml-2 text-xs font-normal text-slate-400">{filtered.length} records</span>
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-md border px-2.5 py-1 text-xs transition ${
                cat === c ? "border-brand bg-brand-soft text-brand" : "border-line text-slate-500 hover:text-slate-800"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`w-40 ${inputCls}`} />
      </div>
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2.5">ID</th>
              <th className="px-2 py-2.5">Date</th>
              <th className="px-2 py-2.5">Category</th>
              <th className="px-2 py-2.5">Major Risk</th>
              <th className="px-2 py-2.5">Zone</th>
              <th className="px-2 py-2.5 min-w-[280px]">What Happened</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.Incident_ID} className="border-t border-line align-top hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">{r.Incident_ID}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">{fmtDate(r["Incident Date"])}</td>
                <td className="px-2 py-2.5"><Badge text={r["Primary Category"]} tone={catTone(r["Primary Category"])} /></td>
                <td className="px-2 py-2.5 text-slate-600">
                  {r["Major Risk"] && r["Major Risk"] !== "Not Applicable" ? <Badge text={r["Major Risk"]} tone="warn" /> : <span className="text-slate-300">—</span>}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">{r["Zone / Area"] ?? "—"}</td>
                <td className="px-2 py-2.5 text-slate-500"><span className="line-clamp-3">{r["What Happened"]}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No incidents match your filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ViolationTable({ rows }: { rows: Violation[] }) {
  const [q, setQ] = useState("");
  const [comp, setComp] = useState("All");
  const comps = useMemo(() => ["All", ...new Set(rows.map((r) => r.Company).filter((c) => c && c !== "-"))], [rows]);

  const filtered = rows.filter((r) => {
    const matchComp = comp === "All" || r.Company === comp;
    const hay = `${r.Name} ${r["Violation Type"]} ${r.Location} ${r["Reported By"]}`.toLowerCase();
    return matchComp && hay.includes(q.toLowerCase());
  });

  return (
    <div className="card animate-fadeup overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        <h3 className="mr-auto text-sm font-semibold text-slate-800">
          Violation Register
          <span className="ml-2 text-xs font-normal text-slate-400">{filtered.length} records</span>
        </h3>
        <select value={comp} onChange={(e) => setComp(e.target.value)} className={inputCls}>
          {comps.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className={`w-40 ${inputCls}`} />
      </div>
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="text-[10px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-2.5">#</th>
              <th className="px-2 py-2.5">Date</th>
              <th className="px-2 py-2.5">Name</th>
              <th className="px-2 py-2.5">Company</th>
              <th className="px-2 py-2.5">Location</th>
              <th className="px-2 py-2.5 min-w-[220px]">Violation</th>
              <th className="px-2 py-2.5">Category</th>
              <th className="px-2 py-2.5">Action</th>
              <th className="px-2 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.SN} className="border-t border-line align-top hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-400">{r.SN}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">{fmtDate(r.Date)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 font-medium text-slate-800">{r.Name}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-slate-500">{r.Company}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-slate-500">{r.Location}</td>
                <td className="px-2 py-2.5 text-slate-600">{r["Violation Type"]}</td>
                <td className="px-2 py-2.5"><Badge text={r.Category} tone={r.Category === "Minor" ? "warn" : "bad"} /></td>
                <td className="whitespace-nowrap px-2 py-2.5 text-slate-500">{r["Disciplinary Action"]}</td>
                <td className="px-2 py-2.5"><Badge text={r.Status} tone={r.Status === "Open" ? "bad" : "good"} /></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No violations match your filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
