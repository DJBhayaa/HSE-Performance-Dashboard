// Project registry + dataset scaffolding for multi-project support and
// in-dashboard data entry.

import type { Dataset, MonthKpi, ZoneKpiRow } from "./types";
import { LEADING_ZONE_METRICS, LAGGING_ZONE_METRICS } from "./metrics";

export interface Project {
  id: string;
  name: string;
  short: string;
}

export const PROJECTS: Project[] = [
  { id: "qntc-male", name: "QNTC (Male) · Court Project 1", short: "QNTC Male" },
  { id: "qntc-female", name: "QNTC (Female)", short: "QNTC Female" },
];

export const MONTH_KEYS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const ALL_ZONE_METRICS = [...LEADING_ZONE_METRICS, ...LAGGING_ZONE_METRICS];

/** Default monthly targets for the leading metrics (from the QNTC Male setup). */
export const DEFAULT_TARGETS: Record<string, number | null> = {
  "Leadership Walkthroughs": 2,
  "H&S Meetings Held": 2,
  "Task Specific trainings": 4,
  "TBT by Production Supervision": 4,
  Drills: 1,
};

/** Monthly KPI fields, grouped for the entry form. Order = display order. */
export const MONTHLY_MAIN_FIELDS = [
  "Manpower",
  "Manhours",
  "Lost Work Days",
  "Near Miss",
  "Major Risk Near Miss",
  "First Aid Cases",
  "Road Traffic Accidents",
  "Dangerous Occurance",
  "Property Damage",
  "Severe Accident",
  "Major Risk Accident",
  "Fatalities",
  "Lost Time Accident",
];
export const MONTHLY_HS_FIELDS = [
  "Mass Briefings",
  "Trainings- Induction",
  "Trainings- Task Specific",
  "Subcontractor & Other HS Meetings",
  "Production HS Leadership Visits",
  "HS Campaigns",
  "HS Awards",
  "HS Audits",
  "Safety Alerts",
  "Mock Drill",
  "Stop & Go by HSE",
  "Stop & Go by Production",
];

export function emptyMonth(dateIso: string): MonthKpi {
  const row: Record<string, string | number | null> = { Date: dateIso };
  for (const f of [...MONTHLY_MAIN_FIELDS, ...MONTHLY_HS_FIELDS]) row[f] = 0;
  return row as unknown as MonthKpi;
}

/** The next calendar month after the dataset's last month (or the current month). */
export function nextMonthIso(dataset: Dataset): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const last = dataset.kpiMonthly[dataset.kpiMonthly.length - 1]?.Date;
  if (last) {
    const [y, m] = String(last).split("-").map(Number);
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    return `${ny}-${pad(nm)}-01`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
}

/** 14 zone-KPI rows (one per metric) for a newly added zone. */
export function zoneRowsFor(zone: string): ZoneKpiRow[] {
  return ALL_ZONE_METRICS.map((metric) => {
    const row: Record<string, string | number | null> = {
      Zone: zone,
      Metric: metric,
      Target: DEFAULT_TARGETS[metric] ?? null,
      Total: 0,
    };
    for (const m of MONTH_KEYS) row[m] = 0;
    return row as unknown as ZoneKpiRow;
  });
}

export function emptyDataset(): Dataset {
  return { kpiMonthly: [], incidents: [], violations: [], zoneKpi: [] };
}
