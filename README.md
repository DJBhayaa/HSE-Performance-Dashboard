# QTC JV — HSE Performance Dashboard

An interactive Health & Safety dashboard for the **BBI-AGC Joint Venture · Qiddiya
Tennis Centre (QTC)** project. It turns the `QTC_HSE_Data_Workbook` into a clean,
manager-ready web dashboard that mirrors the JV reporting structure — focused on
the metrics that matter, not an overwhelming wall of numbers.

## What it shows

The dashboard is organised into four tabs:

| Tab | Contents |
| --- | --- |
| **Overview** | The 8 headline KPIs (Manhours, Manpower, Global & LTA Frequency Rates, First Aid, Near Miss, Total & Open Violations), proactive leading indicators, the **Safety Triangle**, and incident / violation breakdowns. |
| **Trends** | Monthly trends — manhours vs manpower, incidents by month, training delivered, intervention & assurance activity. |
| **Zones** | Near misses & violations by area plus a **Zone × Metric** scorecard matrix. |
| **Records** | Searchable, filterable **Incident & Near-Miss log** and **Violation register**. |

Every figure is **derived in code** from the workbook data (`lib/metrics.ts`), so
the headline cards and charts always agree with the source numbers.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for styling (dark "command-center" theme)
- **Recharts** for charts; a hand-built SVG safety triangle
- Fully static — no backend, no database

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## Updating the data

The dashboard reads from `lib/data.ts`, which is generated from the Excel workbook.
To refresh after the workbook changes, re-export the four data sheets
(`KPI_Monthly`, `Incidents`, `Violations`, `Zone_KPI`) to JSON and regenerate
`lib/data.ts`. The aggregation logic in `lib/metrics.ts` recomputes every KPI and
chart automatically.

## Project structure

```
app/                 Next.js app router (layout, page, global styles)
components/
  Dashboard.tsx      Main shell + tab navigation
  ui.tsx             KPI cards, panels, section headers
  Tables.tsx         Interactive incident & violation tables
  charts/            Recharts wrappers + SafetyTriangle
lib/
  data.ts            Embedded workbook data (source of truth)
  metrics.ts         KPI & chart aggregations
  types.ts           Shared types
```

## Deployment

Deploys as-is to **Vercel** (zero config) or any Node host via `npm run build && npm run start`.
