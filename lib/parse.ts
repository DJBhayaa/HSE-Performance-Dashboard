// Workbook parser — reads the QTC HSE Data Workbook and returns the Dataset the
// dashboard renders from. Only the current production layout is supported:
//
//   • "Main Data"     — one row per month: hours, manpower and incident counts
//   • "H&S"           — one row per month: training / leading-indicator counts
//   • "Accident logs" — the incident / near-miss / accident register
//   • "Violations"    — the violation register
//   • "KPI Data"      — long format zone KPIs (ZONE / METRIC / MONTH / VALUE / TARGET)
//
// Every headline number is recomputed in metrics.ts from these raw tables, so
// the workbook's own formula/summary sheets are ignored.

import * as XLSX from "xlsx";
import type { Dataset, MonthKpi, Incident, Violation, ZoneKpiRow } from "./types";

const REQUIRED_SHEETS = ["Main Data", "H&S", "Accident logs", "Violations", "KPI Data"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Normalise any date-ish cell to an ISO "YYYY-MM-DD" string (null if unparseable). */
function toISO(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  const d = new Date(String(v).trim());
  return isNaN(d.getTime()) ? null : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const num = (v: unknown): number => {
  if (typeof v === "number") return v;
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const str = (v: unknown): string => (v == null ? "" : String(v).trim());

/** True when a cell actually holds a value (blank template rows come back as ""). */
const filled = (v: unknown): boolean => v != null && String(v).trim() !== "";

/** Read a sheet as objects. `headerRow` (0-based) is the row that holds the headers. */
function rowsOf(wb: XLSX.WorkBook, sheet: string, headerRow = 0): Record<string, unknown>[] {
  const ws = wb.Sheets[sheet];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: true, range: headerRow });
}

/** First present key wins — tolerates minor header spelling/spacing differences. */
function pick(r: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (k in r) return r[k];
  return null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_ABBR: Record<string, string> = {
  January: "Jan", February: "Feb", March: "Mar", April: "Apr", May: "May", June: "Jun",
  July: "Jul", August: "Aug", September: "Sep", October: "Oct", November: "Nov", December: "Dec",
};

export interface ParseResult {
  dataset: Dataset;
  summary: { months: number; incidents: number; violations: number; zoneRows: number };
}

function summarize(dataset: Dataset): ParseResult {
  return {
    dataset,
    summary: {
      months: dataset.kpiMonthly.filter((m) => num(m.Manhours) > 0).length,
      incidents: dataset.incidents.length,
      violations: dataset.violations.length,
      zoneRows: dataset.zoneKpi.length,
    },
  };
}

export function parseWorkbook(buf: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });

  const missing = REQUIRED_SHEETS.filter((s) => !wb.SheetNames.includes(s));
  if (missing.length) {
    throw new Error(
      `The workbook is missing the sheet(s): ${missing.join(", ")}. ` +
        `Please upload the QTC HSE Data Workbook (sheets: ${REQUIRED_SHEETS.join(", ")}).`
    );
  }

  // ── kpiMonthly: merge "Main Data" (hours + counts, header on 2nd row) with
  //    "H&S" (training / leading indicators) by month ─────────────────────────
  const hsByMonth = new Map<string, Record<string, unknown>>();
  for (const r of rowsOf(wb, "H&S", 0)) {
    const iso = toISO(r["Concerned Month"]);
    if (iso) hsByMonth.set(iso, r);
  }
  const kpiMonthly: MonthKpi[] = rowsOf(wb, "Main Data", 1)
    .filter((r) => filled(r["Concerned Month"]))
    .map((r) => {
      const iso = toISO(r["Concerned Month"]) ?? "";
      const h = hsByMonth.get(iso) ?? {};
      return {
        Date: iso,
        Manpower: num(r["Manpower"]),
        Manhours: num(pick(r, "Worked Hours ", "Worked Hours")),
        "Lost Work Days": num(pick(r, "Nb of Days lost", "Nb of Days Lost")),
        "Near Miss": num(r["NM"]),
        "Major Risk Near Miss": num(r["MRN"]),
        "First Aid Cases": num(r["FA"]),
        "Road Traffic Accidents": num(r["RTA"]),
        "Dangerous Occurance": num(r["Dangerous Occurance"]),
        "Property Damage": num(r["Property Damage"]),
        "Severe Accident": num(r["Severe Accident"]),
        "Major Risk Accident": num(r["MRA"]),
        Fatalities: num(r["Fatalities"]),
        "Lost Time Accident": num(r["LTA"]),
        "Mass Briefings": num(h["Mass-Briefings"]),
        "Trainings- Induction": num(h["Training-Induction"]),
        "Trainings- Task Specific": num(h["Task Specific Trainings"]),
        "Subcontractor & Other HS Meetings": num(h["Subcontractor Pre-QualificatIon H&S Meetings"]),
        "Production HS Leadership Visits": num(h["Production H&S Leadership Vists"]),
        "HS Campaigns": num(h["H&S Campaign"]),
        "HS Awards": num(h["H&S Awards"]),
        "HS Audits": num(h["H&S Audits"]),
        "Safety Alerts": num(h["Safety Alerts"]),
        "Mock Drill": num(h["Mock Drill"]),
        "Stop & Go by HSE": num(h["Stop & Go By H&S"]),
        "Stop & Go by Production": num(h["Stop & Go By Production"]),
      } as unknown as MonthKpi;
    });

  // ── incidents: "Accident logs" (no ID column → generate a stable one) ───────
  let idc = 0;
  const incidents: Incident[] = rowsOf(wb, "Accident logs", 0)
    .filter((r) => filled(r["Primary Category"]) || filled(r["What Happened"]))
    .map((r) => {
      idc += 1;
      return {
        Incident_ID: `INC-${String(idc).padStart(3, "0")}`,
        "Incident Date": toISO(r["Incident Date"]),
        Month: toISO(r["Month"]),
        "Reported By": str(r["Reported By"]),
        "Primary Category": str(r["Primary Category"]),
        Classification: (r["Classification [Incident]"] as string) ?? null,
        "Event Severity": (r["Event severity"] as string) ?? null,
        "Major Risk": (pick(r, "Major risks (If Any)", "Major Risk") as string) ?? null,
        "Zone / Area": (r["Zone / Area"] as string) ?? null,
        Population: (r["Population"] as string) ?? null,
        "Days Lost": num(pick(r, "DaysLost", "Days Lost")),
        "What Happened": (r["What Happened"] as string) ?? null,
        "Immediate Actions": (r["Immediate actions taken"] as string) ?? null,
      } as unknown as Incident;
    });

  // ── violations ──────────────────────────────────────────────────────────────
  const violations: Violation[] = rowsOf(wb, "Violations", 0)
    .filter((r) => filled(r["Violation Type"]))
    .map((r) => ({
      ...r,
      SN: num(r["SN"]),
      "Iqama No.": str(r["Iqama No."]),
      Name: str(r["Name"]),
      Company: str(r["Company"]),
      Location: str(r["Location"]),
      "Violation Type": str(r["Violation Type"]),
      Category: str(r["Category"]),
      Date: toISO(r["Date"]),
      Month: toISO(r["Month"]),
      Status: str(r["Status"]) || "Open",
      Count: num(r["Count"]) || 1,
    })) as unknown as Violation[];

  // ── zoneKpi: "KPI Data" long format → wide (Zone × Metric with monthly cols) ─
  const zmap = new Map<string, Record<string, string | number | null>>();
  for (const r of rowsOf(wb, "KPI Data", 0)) {
    if (!filled(r["ZONE"]) || !filled(r["KPI METRIC"])) continue;
    const zone = str(r["ZONE"]);
    const metric = str(r["KPI METRIC"]);
    const key = `${zone}||${metric}`;
    let row = zmap.get(key);
    if (!row) {
      row = { Zone: zone, Metric: metric, Target: null, Total: 0 };
      for (const m of MONTHS) row[m] = 0;
      zmap.set(key, row);
    }
    const mn = MONTH_ABBR[str(r["MONTH"])];
    if (mn) row[mn] = num(r["VALUE"]);
    if (row.Target == null && r["TARGET"] != null) row.Target = num(r["TARGET"]);
  }
  const zoneKpi = [...zmap.values()].map((row) => {
    row.Total = MONTHS.reduce((a, m) => a + num(row[m]), 0);
    return row as unknown as ZoneKpiRow;
  });

  return summarize({ kpiMonthly, incidents, violations, zoneKpi });
}

/** Fetch + parse the workbook shipped in /public/data at runtime. */
export async function loadWorkbookFile(url = "/data/QTC_HSE_Data_Workbook.xlsx"): Promise<ParseResult> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Workbook file not found (${res.status})`);
  return parseWorkbook(await res.arrayBuffer());
}
