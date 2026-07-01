// Shared types for the HSE dashboard data model.

export interface MonthKpi {
  Date: string;
  Manhours: number;
  Manpower: number;
  Fatalities: number;
  "Lost Time Accident": number;
  "Lost Work Days": number;
  "Severe Accident": number;
  "Major Risk Accident": number;
  "Road Traffic Accidents": number;
  "First Aid Cases": number;
  "Property Damage": number;
  "Dangerous Occurance": number;
  "Near Miss": number;
  "Major Risk Near Miss": number;
  "Mass Briefings": number;
  "Trainings- Induction": number;
  "Trainings- Task Specific": number;
  "Subcontractor & Other HS Meetings": number;
  "Production HS Leadership Visits": number;
  "HS Campaigns": number;
  "HS Awards": number;
  "HS Audits": number;
  "Safety Alerts": number;
  "Mock Drill": number;
  "Stop & Go by HSE": number;
  "Stop & Go by Production": number;
  "LTA Frequency Rate": number;
  "LTA Severity Rate": number;
  "Global Frequency Rate": number;
  [key: string]: string | number | null;
}

export interface Incident {
  Incident_ID: string;
  "Incident Date": string;
  Month: string;
  "Reported By": string;
  "Primary Category": string;
  Classification: string | null;
  "Event Severity": string | null;
  "Major Risk": string | null;
  "Zone / Area": string | null;
  "Days Lost": number | null;
  "What Happened": string | null;
  [key: string]: string | number | null;
}

export interface Violation {
  SN: number;
  "Iqama No.": string;
  Name: string;
  Company: string;
  Location: string;
  "Violation Type": string;
  Category: string;
  Date: string;
  Month: string;
  "Disciplinary Action": string;
  Status: string;
  Count: number;
  "Reported By": string;
  Remarks: string;
  [key: string]: string | number | null;
}

export interface ZoneKpiRow {
  Zone: string;
  Metric: string;
  Target: number | null;
  Total: number;
  [key: string]: string | number | null;
}

/** The full set of raw tables the dashboard is built from. */
export interface Dataset {
  kpiMonthly: MonthKpi[];
  incidents: Incident[];
  violations: Violation[];
  zoneKpi: ZoneKpiRow[];
}

/** Where the currently-displayed data came from. */
export type DataSource = "bundled" | "workbook-file" | "uploaded";
