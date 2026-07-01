"use client";

import React, { useState } from "react";
import type { Metrics } from "@/lib/metrics";
import { Panel, SectionTitle, numberFmt } from "./ui";
import { HBar, Donut } from "./charts/Charts";

const fmtDate = (iso: string) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export function Violators({ m }: { m: Metrics }) {
  const [q, setQ] = useState("");
  const board = m.violatorsLeaderboard;
  const maxCount = Math.max(1, ...board.map((v) => v.count));
  const filtered = board.filter(
    (v) => v.name.toLowerCase().includes(q.toLowerCase()) || v.company.toLowerCase().includes(q.toLowerCase())
  );
  const topChart = board.slice(0, 8).map((v) => ({ name: v.name, value: v.count }));

  return (
    <div className="space-y-6">
      <SectionTitle kicker="Accountability" title="Violations & Violators" hint="Who is driving the violations" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Total Violations" value={m.headline.totalViolations} accent="#F15A22" />
        <Mini label="Unique Violators" value={m.uniqueViolators} accent="#2563EB" />
        <Mini label="Repeat Offenders" value={m.repeatOffenders} accent="#D97706" sub="2+ violations" />
        <Mini
          label="Major / Critical"
          value={m.violationsByCategory.filter((c) => c.name !== "Minor").reduce((a, c) => a + c.value, 0)}
          accent="#EF4444"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Top Violators" subtitle="By number of recorded violations" className="lg:col-span-2">
          <HBar data={topChart} color="#F15A22" labelWidth={140} maxLabel={20} height={260} />
        </Panel>
        <Panel title="By Category" subtitle="Minor / Major / Critical">
          <Donut data={m.violationsByCategory} centerLabel="Violations" height={260} />
        </Panel>
        <Panel title="By Company" subtitle="Where violations concentrate">
          <HBar data={m.violationsByCompany} color="#2563EB" labelWidth={130} maxLabel={18} height={230} />
        </Panel>
        <Panel title="By Location" subtitle="Compliance hot-spots">
          <HBar data={m.violationsByLocation} color="#7C3AED" labelWidth={110} maxLabel={16} height={230} />
        </Panel>
        <Panel title="By Status" subtitle="Open vs closed">
          <Donut
            data={m.violationsByStatus.map((d) => ({ ...d, color: d.name === "Open" ? "#EF4444" : "#10B981" }))}
            centerLabel="Violations"
            height={230}
          />
        </Panel>
      </div>

      <div className="card animate-fadeup overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <h3 className="mr-auto text-sm font-semibold text-slate-800">
            Violator Leaderboard
            <span className="ml-2 text-xs font-normal text-slate-400">{filtered.length} people</span>
          </h3>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / company…"
            className="w-56 rounded-md border border-line bg-white px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none"
          />
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="text-[10px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5">#</th>
                <th className="px-2 py-2.5">Name</th>
                <th className="px-2 py-2.5">Iqama No.</th>
                <th className="px-2 py-2.5">Company</th>
                <th className="px-2 py-2.5 min-w-[140px]">Violations</th>
                <th className="px-2 py-2.5">Categories</th>
                <th className="px-2 py-2.5">Locations</th>
                <th className="px-2 py-2.5">Last</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => {
                const repeat = v.count > 1;
                return (
                  <tr key={v.key} className="border-t border-line hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-medium text-slate-800">
                      {v.name}
                      {repeat && (
                        <span className="ml-2 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">REPEAT</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-mono text-[11px] text-slate-400">{v.iqama}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-slate-500">{v.company}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${(v.count / maxCount) * 100}%`, background: repeat ? "#D97706" : "#F15A22" }} />
                        </div>
                        <span className="font-semibold tabular-nums text-slate-900">{v.count}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {v.categories.map((c) => (
                          <span key={c} className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${c === "Minor" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{c}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-slate-500">{v.locations.join(", ")}</td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-slate-500">{fmtDate(v.lastDate)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No violators match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, accent, sub }: { label: string; value: number; accent: string; sub?: string }) {
  return (
    <div className="card card-hover animate-fadeup relative overflow-hidden p-4">
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: accent }} />
      <div className="pl-1.5">
        <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</div>
        <div className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">{numberFmt(value)}</div>
        {sub && <div className="mt-1 text-[11px] text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}
