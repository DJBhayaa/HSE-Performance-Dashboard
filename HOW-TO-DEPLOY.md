# QTC JV — H&S Dashboard: Deploy & Monthly Update Guide

## What powers the dashboard
The dashboard reads **one Excel file** at runtime:

```
public/data/QTC_HSE_Data_Workbook.xlsx
```

⚠️ **This is NOT a cache file — do not delete it.** It IS the data. If it's
missing, the dashboard falls back to built-in sample numbers.

---

## First-time deploy on Vercel (free, no admin needed)

1. Put the code in your GitHub repo (unzip → GitHub **Add file → Upload files**
   → drag the folder contents → **Commit to `main`**).
2. Go to **vercel.com** → **Sign up / Log in with GitHub**.
3. **Add New… → Project** → import **Dashboard-H-S** → **Deploy**
   (it auto-detects Next.js — change nothing).
4. ~1 minute later you get a live link like `dashboard-h-s.vercel.app`.

If you deleted the Vercel project before: just repeat steps 2–4 to re-import
the same GitHub repo. Your code and data are safe in GitHub.

---

## Updating the data every month  ✅ NO code changes, NO need to re-contact anyone

The dashboard rebuilds itself from the Excel file. Each month:

1. In Excel, add the new month's rows to your workbook (the same file with the
   sheets **Main Data, H&S, Accident logs, KPI Data, Violations**).
2. On GitHub, open the **`public/data`** folder → **Add file → Upload files**.
3. Drop in your updated workbook, **named exactly**
   `QTC_HSE_Data_Workbook.xlsx` (replace the existing one) → **Commit**.
4. Vercel redeploys automatically. The new month appears in ~1 minute.

That's it. **You do not need to change any code** as long as the workbook keeps
the same sheet names and column headers.

### Even quicker (preview only)
On the dashboard, the **⬆ Update Data** tab lets you drag-and-drop the workbook
to preview a new month instantly on your screen. This is temporary (resets on
refresh) — to update the shared link for everyone, use the GitHub step above.

---

## When WOULD you need code changes?
Only if you:
- Rename sheets or columns / change the workbook's structure, **or**
- Want new charts, KPIs, pages, or logos.

Normal monthly data entry never needs code changes.

## Logos
Drop PNGs into `public/logos/` (they override the placeholders automatically):
`primary-logo.png` (QTC JV), `secondary-logo.png` (Bouygues),
`welovelife.png`, `almabani-logo.png`.
