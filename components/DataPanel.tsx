"use client";

import React, { useRef, useState } from "react";
import type { Dataset, DataSource } from "@/lib/types";
import { parseWorkbook } from "@/lib/parse";
import { Panel } from "./ui";

interface Summary {
  months: number;
  incidents: number;
  violations: number;
  zoneRows: number;
}

export function DataPanel({
  source,
  summary,
  fileName,
  onLoaded,
}: {
  source: DataSource;
  summary: Summary;
  fileName?: string;
  onLoaded: (d: Dataset, s: Summary, name: string) => void;
}) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      if (!/\.xlsx?$/i.test(file.name)) throw new Error("Please choose an Excel file (.xlsx).");
      const buf = await file.arrayBuffer();
      const { dataset, summary } = parseWorkbook(buf);
      onLoaded(dataset, summary, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that workbook.");
    } finally {
      setBusy(false);
    }
  }

  const sourceLabel: Record<DataSource, string> = {
    bundled: "Built-in sample (bundled with the app)",
    "workbook-file": "Workbook file in the project (/data)",
    uploaded: `Uploaded just now${fileName ? ` — ${fileName}` : ""}`,
  };

  return (
    <div className="space-y-6">
      <Panel title="Current Data Source" subtitle="What the dashboard is showing right now">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg border border-brand-ring bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-dark">
            <span className="h-2 w-2 rounded-full bg-brand" />
            {sourceLabel[source]}
          </span>
          <div className="flex gap-4 text-xs text-slate-500">
            <span><b className="text-slate-900">{summary.months}</b> months</span>
            <span><b className="text-slate-900">{summary.incidents}</b> incidents</span>
            <span><b className="text-slate-900">{summary.violations}</b> violations</span>
            <span><b className="text-slate-900">{summary.zoneRows}</b> zone rows</span>
          </div>
        </div>
      </Panel>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`card animate-fadeup flex flex-col items-center justify-center gap-3 border-2 border-dashed p-10 text-center transition ${
          drag ? "border-brand bg-brand-soft" : "border-line"
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 16V4m0 0L8 8m4-4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{busy ? "Reading workbook…" : "Drop your QTC HSE Workbook (.xlsx) here"}</p>
          <p className="mt-0.5 text-xs text-slate-400">or click to browse — the dashboard updates instantly</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          Choose file
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }} />
        {error && <p className="mt-1 max-w-md rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Quick preview (this device)" subtitle="Try a new month in seconds">
          <ol className="space-y-2 text-xs leading-relaxed text-slate-500">
            <li><b className="text-slate-700">1.</b> In Excel, add the new month's figures to your workbook (KPI_Monthly, Incidents, Violations, Zone_KPI).</li>
            <li><b className="text-slate-700">2.</b> Drag that file into the box above.</li>
            <li><b className="text-slate-700">3.</b> The whole dashboard updates live. (This preview is only on your screen — it resets on refresh.)</li>
          </ol>
        </Panel>
        <Panel title="Make it permanent (everyone's link)" subtitle="Update the shared dashboard">
          <ol className="space-y-2 text-xs leading-relaxed text-slate-500">
            <li><b className="text-slate-700">1.</b> On GitHub, open <code className="rounded bg-slate-100 px-1 text-slate-700">public/data/</code> in your repo.</li>
            <li><b className="text-slate-700">2.</b> Click <b>Add file → Upload files</b> and drop your updated <code className="rounded bg-slate-100 px-1 text-slate-700">QTC_HSE_Data_Workbook.xlsx</code> (same name) → Commit.</li>
            <li><b className="text-slate-700">3.</b> Vercel rebuilds automatically — the live link shows the new month within a minute.</li>
          </ol>
        </Panel>
      </div>

      <Panel title="Workbook template" subtitle="Keep the structure consistent">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Download the current workbook to use as your template. Keep the sheet names and column headers the same so the dashboard can read it.
          </p>
          <a href="/data/QTC_HSE_Data_Workbook.xlsx" download className="whitespace-nowrap rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand hover:text-brand">
            ⬇ Download workbook
          </a>
        </div>
      </Panel>
    </div>
  );
}
