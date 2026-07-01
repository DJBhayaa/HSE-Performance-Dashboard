// Aggregation layer. Everything the dashboard shows is derived here from a
// Dataset, so the figures always agree with the source workbook. buildMetrics()
// is pure — give it a dataset and it returns every KPI, breakdown and series.

import type { Dataset, MonthKpi, Incident, Violation, ZoneKpiRow } from "./types";

const n = (v: unknown): number => (typeof v === "number" ? v : 0);

// The 7 leading (proactive) and 7 lagging (outcome) zone KPI metrics.
export const LEADING_ZONE_METRICS = [
  "Leadership Walkthroughs",
  "Stop&Go by H&S",
  "Stop&Go by Production",
  "H&S Meetings Held",
  "Task Specific trainings",
  "TBT by Production Supervision",
  "Drills",
];
export const LAGGING_ZONE_METRICS = [
  "Near Misses",
  "Major Risk Near Misses",
  "Property Damage",
  "First Aid Cases",
  "LTA (Lost Time Accident)",
  "Major Risk Accident",
  "Severe Accident",
];

export const monthLabel = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
};

export const monthLong = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

// Recordable events used for the Global Frequency Rate.
// Matches the workbook: LTA + Severe + Major Risk Accident + RTA (first aid is
// NOT counted as a recordable here). Reproduces the YTD rate of 1.58.
const recordablesOf = (m: MonthKpi): number =>
  n(m["Lost Time Accident"]) +
  n(m["Severe Accident"]) +
  n(m["Major Risk Accident"]) +
  n(m["Road Traffic Accidents"]);

export interface MonthlyPoint {
  date: string;
  label: string;
  long: string;
  manhours: number;
  manpower: number;
  globalFreq: number;
  ltaFreq: number;
  ltaSeverity: number;
  firstAid: number;
  nearMiss: number;
  lta: number;
  lostWorkDays: number;
  severe: number;
  fatalities: number;
  roadTraffic: number;
  majorRiskAccident: number;
  majorRiskNearMiss: number;
  propertyDamage: number;
  violations: number;
  openViolations: number;
  inductions: number;
  taskSpecific: number;
  stopGo: number;
  audits: number;
  leadership: number;
}

export interface Metrics {
  ok: boolean;
  activeMonths: MonthKpi[];
  monthly: MonthlyPoint[];
  periodStart: string;
  periodEnd: string;
  headline: ReturnType<typeof headlineFor>;
  leading: Record<string, number>;
  safetyTriangle: { level: string; value: number; color: string }[];
  incidentsByCategory: { name: string; value: number }[];
  incidentsByMajorRisk: { name: string; value: number }[];
  incidentsByZone: { name: string; value: number }[];
  incidentMajorRiskByMonth: Record<string, string | number>[];
  violationsByCategory: { name: string; value: number }[];
  violationsByCompany: { name: string; value: number }[];
  violationsByStatus: { name: string; value: number }[];
  violationsByLocation: { name: string; value: number }[];
  violationsByType: { name: string; value: number }[];
  violatorsLeaderboard: Violator[];
  uniqueViolators: number;
  repeatOffenders: number;
  nearMissByZone: { name: string; value: number }[];
  trainingSplit: { name: string; value: number; color: string }[];
  zoneNames: string[];
  zoneMetricNames: string[];
  zoneValue: (zone: string, metric: string) => number;
  zoneMonths: string[];
  zoneMonthly: (metric: string) => Record<string, string | number>[];
  zoneTotalsByMetric: (metric: string) => { name: string; value: number }[];
  zoneTarget: (metric: string) => number | null;
  zoneGroupMonthly: (metrics: string[]) => Record<string, string | number>[];
  leadingZoneMetrics: string[];
  laggingZoneMetrics: string[];
  incidentRows: Incident[];
  violationRows: Violation[];
}

export interface Violator {
  key: string;
  name: string;
  iqama: string;
  company: string;
  count: number;
  categories: string[];
  lastDate: string;
  locations: string[];
}

function countBy<T>(rows: T[], key: (r: T) => string, weight: (r: T) => number = () => 1) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (!k || k === "-") continue;
    map.set(k, (map.get(k) ?? 0) + weight(r));
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function headlineFor(active: MonthKpi[], violations: Violation[]) {
  const sum = (key: keyof MonthKpi) => active.reduce((a, m) => a + n(m[key]), 0);
  const latest = active[active.length - 1];
  const mh = sum("Manhours");
  return {
    manhoursYtd: mh,
    manpowerLatest: n(latest?.Manpower),
    globalFreqRateYtd: mh ? (active.reduce((a, m) => a + recordablesOf(m), 0) * 1_000_000) / mh : 0,
    ltaFreqRateYtd: mh ? (sum("Lost Time Accident") * 1_000_000) / mh : 0,
    ltaSeverityRateYtd: mh ? (sum("Lost Work Days") * 1_000_000) / mh : 0,
    firstAidYtd: sum("First Aid Cases"),
    nearMissYtd: sum("Near Miss"),
    fatalitiesYtd: sum("Fatalities"),
    ltaYtd: sum("Lost Time Accident"),
    lostWorkDaysYtd: sum("Lost Work Days"),
    roadTrafficYtd: sum("Road Traffic Accidents"),
    majorRiskAccidentYtd: sum("Major Risk Accident"),
    majorRiskNearMissYtd: sum("Major Risk Near Miss"),
    severeYtd: sum("Severe Accident"),
    propertyDamageYtd: sum("Property Damage"),
    totalViolations: violations.reduce((a, v) => a + (n(v.Count) || 1), 0),
    openViolations: violations.filter((v) => v.Status === "Open").length,
  };
}

export function buildMetrics(data: Dataset): Metrics {
  const MONTHS = data.kpiMonthly ?? [];
  const INCIDENTS = data.incidents ?? [];
  const VIOLATIONS = data.violations ?? [];
  const ZONES = data.zoneKpi ?? [];

  const active = MONTHS.filter((m) => n(m.Manhours) > 0);
  const sum = (key: keyof MonthKpi) => active.reduce((a, m) => a + n(m[key]), 0);

  // Per-month series with everything needed for monthly KPI cards & deltas.
  const violationsInMonth = (iso: string) =>
    VIOLATIONS.filter((v) => v.Month === iso).reduce((a, v) => a + (n(v.Count) || 1), 0);
  const openViolationsInMonth = (iso: string) =>
    VIOLATIONS.filter((v) => v.Month === iso && v.Status === "Open").length;

  const monthly: MonthlyPoint[] = active.map((m) => {
    const mh = n(m.Manhours);
    const rec = recordablesOf(m);
    return {
      date: m.Date,
      label: monthLabel(m.Date),
      long: monthLong(m.Date),
      manhours: mh,
      manpower: n(m.Manpower),
      globalFreq: mh ? (rec * 1_000_000) / mh : 0,
      ltaFreq: mh ? (n(m["Lost Time Accident"]) * 1_000_000) / mh : 0,
      ltaSeverity: mh ? (n(m["Lost Work Days"]) * 1_000_000) / mh : 0,
      firstAid: n(m["First Aid Cases"]),
      nearMiss: n(m["Near Miss"]),
      lta: n(m["Lost Time Accident"]),
      lostWorkDays: n(m["Lost Work Days"]),
      severe: n(m["Severe Accident"]),
      fatalities: n(m.Fatalities),
      roadTraffic: n(m["Road Traffic Accidents"]),
      majorRiskAccident: n(m["Major Risk Accident"]),
      majorRiskNearMiss: n(m["Major Risk Near Miss"]),
      propertyDamage: n(m["Property Damage"]),
      violations: violationsInMonth(m.Date),
      openViolations: openViolationsInMonth(m.Date),
      inductions: n(m["Trainings- Induction"]),
      taskSpecific: n(m["Trainings- Task Specific"]),
      stopGo: n(m["Stop & Go by HSE"]) + n(m["Stop & Go by Production"]),
      audits: n(m["HS Audits"]),
      leadership: n(m["Production HS Leadership Visits"]),
    };
  });

  const leading = {
    inductions: sum("Trainings- Induction"),
    taskSpecific: sum("Trainings- Task Specific"),
    massBriefings: sum("Mass Briefings"),
    leadershipVisits: sum("Production HS Leadership Visits"),
    hsMeetings: sum("Subcontractor & Other HS Meetings"),
    audits: sum("HS Audits"),
    drills: sum("Mock Drill"),
    stopGoHse: sum("Stop & Go by HSE"),
    stopGoProd: sum("Stop & Go by Production"),
    safetyAlerts: sum("Safety Alerts"),
    campaigns: sum("HS Campaigns"),
  };

  const safetyTriangle = [
    { level: "Lost Time Accident", value: sum("Lost Time Accident"), color: "#C2410C" },
    { level: "Severe Accident", value: sum("Severe Accident"), color: "#F15A22" },
    { level: "First Aid Cases", value: sum("First Aid Cases"), color: "#FBBF24" },
    { level: "Near Miss", value: sum("Near Miss"), color: "#2563EB" },
    { level: "Stop & Go (HSE + Production)", value: leading.stopGoHse + leading.stopGoProd, color: "#38BDF8" },
  ];

  // Violators leaderboard — keyed by Iqama (falls back to name).
  const vmap = new Map<string, Violator>();
  for (const v of VIOLATIONS) {
    const name = v.Name?.trim();
    if (!name || name === "-") continue;
    const key = (v["Iqama No."] || name).toString();
    const cur =
      vmap.get(key) ??
      ({ key, name, iqama: v["Iqama No."] || "-", company: v.Company, count: 0, categories: [], lastDate: "", locations: [] } as Violator);
    cur.count += n(v.Count) || 1;
    if (v.Category && !cur.categories.includes(v.Category)) cur.categories.push(v.Category);
    if (v.Location && !cur.locations.includes(v.Location)) cur.locations.push(v.Location);
    if (!cur.lastDate || (v.Date && v.Date > cur.lastDate)) cur.lastDate = v.Date;
    vmap.set(key, cur);
  }
  const violatorsLeaderboard = [...vmap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // Zone monthly helpers (for the per-metric Zone KPI charts).
  const zoneNamesList = [...new Set(ZONES.map((z) => z.Zone))];
  const CAL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const zoneMonths = CAL.filter((mn) => ZONES.reduce((a, z) => a + n(z[mn]), 0) > 0);
  const zoneValueFn = (zone: string, metric: string) => n(ZONES.find((z) => z.Zone === zone && z.Metric === metric)?.Total);
  const zoneMonthly = (metric: string): Record<string, string | number>[] =>
    zoneMonths.map((mn) => {
      const row: Record<string, string | number> = { month: mn };
      for (const z of zoneNamesList) row[z] = n(ZONES.find((r) => r.Zone === z && r.Metric === metric)?.[mn]);
      return row;
    });
  const zoneTotalsByMetric = (metric: string) => zoneNamesList.map((z) => ({ name: z, value: zoneValueFn(z, metric) }));
  const zoneTarget = (metric: string): number | null => {
    const row = ZONES.find((z) => z.Metric === metric && z.Target != null);
    return row ? n(row.Target) : null;
  };
  // Sum a group of metrics (e.g. the 7 leading) per zone per month, plus a Total trend line.
  const zoneGroupMonthly = (metrics: string[]): Record<string, string | number>[] =>
    zoneMonths.map((mn) => {
      const row: Record<string, string | number> = { month: mn };
      let total = 0;
      for (const z of zoneNamesList) {
        let s = 0;
        for (const mt of metrics) s += n(ZONES.find((r) => r.Zone === z && r.Metric === mt)?.[mn]);
        row[z] = s;
        total += s;
      }
      row.Total = total;
      return row;
    });
  const zoneMetricSet = new Set(ZONES.map((z) => z.Metric));

  return {
    ok: active.length > 0,
    activeMonths: active,
    monthly,
    periodStart: active[0]?.Date ?? "",
    periodEnd: active[active.length - 1]?.Date ?? "",
    headline: headlineFor(active, VIOLATIONS),
    leading,
    safetyTriangle,
    incidentsByCategory: countBy(INCIDENTS, (i) => i["Primary Category"]),
    incidentsByMajorRisk: countBy(
      INCIDENTS.filter((i) => i["Major Risk"] && i["Major Risk"] !== "Not Applicable"),
      (i) => String(i["Major Risk"])
    ),
    incidentsByZone: countBy(INCIDENTS, (i) => String(i["Zone / Area"] ?? "")),
    incidentMajorRiskByMonth: (() => {
      const risks = [...new Set(INCIDENTS.map((i) => i["Major Risk"]).filter((r) => r && r !== "Not Applicable"))] as string[];
      return active.map((mo) => {
        const row: Record<string, string | number> = { month: monthLabel(mo.Date) };
        for (const rk of risks) row[rk] = INCIDENTS.filter((i) => i.Month === mo.Date && i["Major Risk"] === rk).length;
        return row;
      });
    })(),
    violationsByCategory: countBy(VIOLATIONS, (v) => v.Category, (v) => n(v.Count) || 1),
    violationsByCompany: countBy(VIOLATIONS, (v) => v.Company, (v) => n(v.Count) || 1),
    violationsByStatus: countBy(VIOLATIONS, (v) => v.Status, (v) => n(v.Count) || 1),
    violationsByLocation: countBy(VIOLATIONS, (v) => v.Location, (v) => n(v.Count) || 1),
    violationsByType: countBy(VIOLATIONS, (v) => v["Violation Type"], (v) => n(v.Count) || 1).slice(0, 8),
    violatorsLeaderboard,
    uniqueViolators: vmap.size,
    repeatOffenders: violatorsLeaderboard.filter((v) => v.count > 1).length,
    nearMissByZone: ZONES.filter((z) => z.Metric === "Near Misses").map((z) => ({ name: z.Zone, value: n(z.Total) })),
    trainingSplit: [
      { name: "Induction", value: sum("Trainings- Induction"), color: "#22d3a8" },
      { name: "Task Specific", value: sum("Trainings- Task Specific"), color: "#3b82f6" },
    ],
    zoneNames: zoneNamesList,
    zoneMetricNames: [...new Set(ZONES.map((z) => z.Metric))],
    zoneValue: zoneValueFn,
    zoneMonths,
    zoneMonthly,
    zoneTotalsByMetric,
    zoneTarget,
    zoneGroupMonthly,
    leadingZoneMetrics: LEADING_ZONE_METRICS.filter((m) => zoneMetricSet.has(m)),
    laggingZoneMetrics: LAGGING_ZONE_METRICS.filter((m) => zoneMetricSet.has(m)),
    incidentRows: INCIDENTS,
    violationRows: VIOLATIONS,
  };
}
