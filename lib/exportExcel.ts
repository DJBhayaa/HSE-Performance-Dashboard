// Dataset → downloadable Excel workbook, in the SAME layout the dashboard can
// import (Main Data / H&S / Accident logs / Violations / KPI Data), so the
// monthly export doubles as a backup that can be re-imported at any time.

import * as XLSX from "xlsx";
import type { Dataset, MonthKpi } from "./types";
import { LEADING_ZONE_METRICS } from "./metrics";
import { MONTH_KEYS, MONTH_FULL } from "./projects";

const n = (v: unknown): number => (typeof v === "number" ? v : 0);
const s = (v: unknown): string => (v == null ? "" : String(v));

export function exportWorkbook(dataset: Dataset, projectId: string) {
  const wb = XLSX.utils.book_new();

  // ── Main Data (banner row first — the importer reads headers from row 2) ──
  const mainHeader = [
    "Concerned Month", "Manpower", "Worked Hours ", "Nb of Days lost", "NM", "MRN", "FA", "RTA",
    "Dangerous Occurance", "Property Damage", "Severe Accident", "MRA", "Fatalities", "LTA",
  ];
  const mainRows = dataset.kpiMonthly.map((m: MonthKpi) => [
    s(m.Date), n(m.Manpower), n(m.Manhours), n(m["Lost Work Days"]), n(m["Near Miss"]),
    n(m["Major Risk Near Miss"]), n(m["First Aid Cases"]), n(m["Road Traffic Accidents"]),
    n(m["Dangerous Occurance"]), n(m["Property Damage"]), n(m["Severe Accident"]),
    n(m["Major Risk Accident"]), n(m.Fatalities), n(m["Lost Time Accident"]),
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["MONTHLY DATA"], mainHeader, ...mainRows]), "Main Data");

  // ── H&S ─────────────────────────────────────────────────────────────────────
  const hsHeader = [
    "Concerned Month", "Mass-Briefings", "Training-Induction", "Task Specific Trainings",
    "Subcontractor Pre-QualificatIon H&S Meetings", "Production H&S Leadership Vists",
    "H&S Campaign", "H&S Awards", "H&S Audits", "Safety Alerts", "Mock Drill",
    "Stop & Go By H&S", "Stop & Go By Production",
  ];
  const hsRows = dataset.kpiMonthly.map((m: MonthKpi) => [
    s(m.Date), n(m["Mass Briefings"]), n(m["Trainings- Induction"]), n(m["Trainings- Task Specific"]),
    n(m["Subcontractor & Other HS Meetings"]), n(m["Production HS Leadership Visits"]),
    n(m["HS Campaigns"]), n(m["HS Awards"]), n(m["HS Audits"]), n(m["Safety Alerts"]),
    n(m["Mock Drill"]), n(m["Stop & Go by HSE"]), n(m["Stop & Go by Production"]),
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([hsHeader, ...hsRows]), "H&S");

  // ── Accident logs ───────────────────────────────────────────────────────────
  const accHeader = [
    "Incident Date", "Month", "Time", "Reported By", "What Happened", "Primary Category",
    "Population", "Zone / Area", "Major risks (If Any)", "Employee Full Name", "DaysLost",
    "Immediate actions taken", "Event severity", "Classification [Incident]",
  ];
  const accRows = dataset.incidents.map((i) => [
    s(i["Incident Date"]), s(i.Month), "", s(i["Reported By"]), s(i["What Happened"]),
    s(i["Primary Category"]), s(i.Population), s(i["Zone / Area"]), s(i["Major Risk"]),
    s(i.Employee), n(i["Days Lost"]), s(i["Immediate Actions"]), s(i["Event Severity"]),
    s(i.Classification),
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([accHeader, ...accRows]), "Accident logs");

  // ── Violations ──────────────────────────────────────────────────────────────
  const vioHeader = [
    "SN", "Iqama No.", "Name", "Company", "Location", "Violation Type", "Category",
    "Date", "Month", "Disciplinary Action", "Status", "Count", "Reported By", "Remarks",
  ];
  const vioRows = dataset.violations.map((v) => [
    n(v.SN), s(v["Iqama No."]), s(v.Name), s(v.Company), s(v.Location), s(v["Violation Type"]),
    s(v.Category), s(v.Date), s(v.Month), s(v["Disciplinary Action"]), s(v.Status),
    n(v.Count) || 1, s(v["Reported By"]), s(v.Remarks),
  ]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([vioHeader, ...vioRows]), "Violations");

  // ── KPI Data (long format) ─────────────────────────────────────────────────
  const kpiHeader = ["ZONE", "KPI METRIC", "MONTH", "MONTH NUMBER", "VALUE", "TARGET", "KPI TYPE"];
  const kpiRows: (string | number)[][] = [];
  for (const row of dataset.zoneKpi) {
    const type = LEADING_ZONE_METRICS.includes(row.Metric) ? "Leading" : "Lagging";
    for (let i = 0; i < 12; i++) {
      kpiRows.push([
        row.Zone, row.Metric, MONTH_FULL[i], i + 1, n(row[MONTH_KEYS[i]]),
        row.Target == null ? "" : n(row.Target), type,
      ]);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([kpiHeader, ...kpiRows]), "KPI Data");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `QTC_HSE_Data_Workbook_${projectId}_${stamp}.xlsx`);
}
