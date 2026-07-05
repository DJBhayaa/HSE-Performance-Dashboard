# QTC JV — H&S Dashboard: Deploy & Monthly Update Guide

## How data works now (multi-project + in-app entry)
The dashboard supports multiple projects (QNTC Male · QNTC Female — switch in
the header) and data is entered **directly in the ✎ Data Entry tab**:
monthly KPIs, incidents, violations and zone KPIs. The Excel workbook is now a
**monthly DOWNLOAD (backup/report), not the input**.

### Enable team-wide cloud storage (one time, ~2 clicks)
Without this, saves stay on the device that entered them. To make entered data
visible to everyone:

1. In Vercel → your project → **Storage** tab → **Create Database → Blob** →
   connect it to the project (this auto-adds `BLOB_READ_WRITE_TOKEN`).
2. **Redeploy.** Saves now go to the cloud and every viewer sees them.

Recommended: also add env var **`EDIT_PIN`** = a short PIN. Anyone can view,
but saving changes then requires the PIN (protects data from stray edits while
the site is public).

### Legacy fallback
`public/data/QTC_HSE_Data_Workbook.xlsx` is still read for the QNTC Male
project when no cloud/device data exists — don't delete it until you've
imported it via Data Entry → Import and saved.

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

## Restricting access (company-only)

The gate is OFF until you configure one of the two modes below. In both modes
every page — and the Excel file itself — requires login; users stay signed in
for 30 days per browser. Env changes always need a **Redeploy** to take effect
(Vercel → Deployments → ⋯ → Redeploy).

### Mode A (recommended) — Email OTP, company domains only
Each person enters their **company email**, receives a **6-digit code**, and
logs in. Emails outside your approved domains can never get a code.

One-time setup (~10 minutes):
1. Create a free **Brevo** account (brevo.com — 300 emails/day free).
   In Brevo: **Settings → Senders** → add & verify your own email address as a
   sender, then **SMTP & API → API Keys** → create a key.
2. In Vercel → **Settings → Environment Variables**, add (Production):
   - `AUTH_SECRET`   = a long random string (e.g. 40+ characters — treat like a password)
   - `ALLOWED_EMAIL_DOMAINS` = `bouygues-construction.com` (comma-separate more:
     `bouygues-construction.com,almabani.com.sa`)
   - `BREVO_API_KEY` = the key from step 1
   - `OTP_FROM_EMAIL` = the sender address you verified in Brevo
3. **Redeploy.**

(Alternative provider: set `RESEND_API_KEY` instead of the Brevo pair — note
Resend needs a verified sending domain to email arbitrary recipients.)

### Mode B — one shared access code (simplest)
Add a single variable `ACCESS_CODE` = a strong passphrase → Redeploy. Everyone
uses the same code; rotate it by changing the variable + redeploy.

Notes:
- If `AUTH_SECRET` is set, Mode A wins; else if `ACCESS_CODE` is set, Mode B;
  if neither, the site is open.
- Remove the variables (+ redeploy) to make the site public again.
- For true corporate SSO (Microsoft 365 / Entra ID), your IT department must
  register the app in Azure AD; that can be added later.

## When WOULD you need code changes?
Only if you:
- Rename sheets or columns / change the workbook's structure, **or**
- Want new charts, KPIs, pages, or logos.

Normal monthly data entry never needs code changes.

## Logos
Drop PNGs into `public/logos/` (they override the placeholders automatically):
`primary-logo.png` (QTC JV), `secondary-logo.png` (Bouygues),
`welovelife.png`, `almabani-logo.png`.
