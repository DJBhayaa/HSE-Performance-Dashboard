# QTC JV — H&S Performance Dashboard

An interactive Health & Safety dashboard for the **QTC Joint Venture · Qiddiya
Tennis Centre**, built from the QTC HSE Data Workbook. White/orange theme,
QTC JV / Bouygues Construction / Almabani branding, "we ❤ life" motto.

## Pages

| Tab | Contents |
| --- | --- |
| **Dashboard** | 12 KPI indicators (First Aid, LTA, Lost Work Days, Global/LTA Freq Rate, LTA Severity Rate, Near Miss, Road Traffic, MRA, MRN, Manhours, Severe) with a **YTD ⟷ Current Month** toggle — Current Month shows the ▲/▼ % change vs the previous month. Plus 9 monthly charts, 4 distribution pies, the Heinrich safety triangle, and a frequency/severity rates chart. A single **Export 16:9 Snapshot** button downloads a 1920×1080 PNG of every KPI and chart. |
| **Zone KPIs** | Leading & Lagging indicators per zone (7 / 7) with a monthly trend line, plus 14 per-metric charts with dashed monthly-target lines. |
| **Violations** | Violator leaderboard (names, Iqama, repeat-offender flags), unique-violator count, and category / company / location / status breakdowns. |
| **Detailed** | Deep-dive analytics + a monthly KPI register table. |
| **Incident Log** | Major-risk analysis (by category, zone, month) + the full incident/accident register. |
| **⬆ Update Data** | Drag-and-drop a workbook to preview a new month instantly. |

Every figure is recomputed in `lib/metrics.ts` from the raw workbook tables, so
the cards and charts always agree with the source. Global Frequency Rate =
`(LTA + Severe + Major Risk Accident + RTA) × 1,000,000 ÷ manhours`.

## Tech stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (light theme) · **Recharts** · **SheetJS (xlsx)** for parsing
- **html2canvas** for the 16:9 snapshot export
- Fully static — no backend, no database

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start   # production
```

## Data source & monthly updates

The dashboard reads **one file at runtime**:

```
public/data/QTC_HSE_Data_Workbook.xlsx
```

⚠️ This is the live data — not a cache. The workbook must contain these sheets:
**Main Data, H&S, Accident logs, Violations, KPI Data**.

To update each month: replace `public/data/QTC_HSE_Data_Workbook.xlsx` (keep the
same name) with your updated workbook and commit — the dashboard rebuilds itself,
**no code changes needed**. `lib/data.ts` holds a bundled copy used only as a
fallback when the file can't be fetched. See **HOW-TO-DEPLOY.md** for the full
Vercel + monthly-update guide.

## Logos

Drop PNGs into `public/logos/` to override the built-in placeholders:
`primary-logo.png` (QTC JV), `secondary-logo.png` (Bouygues),
`welovelife.png`, `almabani-logo.png`.

## Project structure

```
app/                 Next.js app router (layout, page, favicon, styles)
components/
  Dashboard.tsx      Shell, sticky header, tabs, Page 1, Detailed, Incident Log
  Snapshot.tsx       16:9 export board + button
  ZoneKPIs.tsx       Leading/Lagging + 14 zone charts
  Violators.tsx      Violator leaderboard
  Tables.tsx         Incident table
  DataPanel.tsx      Update-data / upload panel
  charts/            Recharts wrappers + SafetyTriangle
  ui.tsx, icons.tsx  KPI cards, panels, logos, icons
lib/
  parse.ts           Workbook → Dataset parser (production format)
  metrics.ts         KPI & chart aggregations
  data.ts            Bundled fallback dataset
  types.ts           Shared types
```
