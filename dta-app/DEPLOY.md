# Deploying to Vercel

The Next.js app lives in this directory. Vercel must use **`dta-app`** as the project root — not the repository root.

## One-time project setup

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → your project → **Settings** → **General**.
2. Set **Root Directory** to `dta-app` and confirm.
3. Clear any custom **Install Command** or **Build Command** overrides (defaults are fine: `npm ci` and `npm run build` from this folder).
4. Add environment variables from [`.env.example`](./.env.example) under **Settings** → **Environment Variables**.

Redeploy after changing Root Directory.

If production builds fail with `ENOENT` under `/vercel/path0/` (for example `.next/routes-manifest-deterministic.json`, `node_modules/next/dist/build/adapter/setup-node-env.external.js`, or `@swc/helpers/...`), Vercel’s Git Integration is validating the **repository root** while `npm ci` / `next build` run in `dta-app/`. Confirm **Root Directory = `dta-app`**, and keep the `vercel-prebuild` / `vercel-postbuild` scripts wired in `package.json` `build` (they mirror `node_modules` and `.next` to the repo root on Vercel only).

## Notion Session Calendar → Google Calendar sync

Sessions in the Notion **Session Calendar** are copied into each primary tutor's Google Calendar (`src/lib/session-sync.ts`). Notion webhooks hit `POST /api/webhooks/notion` in real time; a daily Vercel cron (`vercel.json`) calls `GET /api/sync/sessions` to reconcile the last 30 days onward and remove orphaned events. Event color follows the Notion **Meeting Type** option color (same on every tutor calendar); the mapping is `MEETING_TYPE_COLORS` in `session-sync.ts`.

1. **Notion:** share the Session Calendar database with the integration (database `•••` menu → **Connections**). Set `NOTION_API_KEY` and `NOTION_SESSIONS_DATA_SOURCE_ID` (data source ID, or the database ID from its URL).
2. **Google Cloud:** in a project, enable the **Google Calendar API**, create a **service account**, and add a JSON key. Put `client_email` in `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` in `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (keep the `\n` escapes, one line).
3. **Calendars:** in Google Calendar, open each tutor calendar → **Settings and sharing** → **Share with specific people** → add the service account email with **Make changes to events**. Copy **Calendar ID** from **Integrate calendar** into `GCAL_CALENDAR_ID_AYUSH_BANDOPADHYAY` / `GCAL_CALENDAR_ID_AYUSH_BAKHANDI`.
4. **Cron:** set `CRON_SECRET` to a random string in Vercel; Vercel Cron sends it as a Bearer token. Trigger manually with `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/sync/sessions`.
5. **Webhook:** deploy first, then in [Notion integrations](https://www.notion.so/profile/integrations) → your integration → **Webhooks**, create a subscription to `https://<domain>/api/webhooks/notion` with page events (created, properties updated, deleted, undeleted, moved). Notion posts a `verification_token`; find it in Vercel **Logs** (`[notion-webhook] verification_token`), set it as `NOTION_WEBHOOK_VERIFICATION_TOKEN`, redeploy, then paste it into Notion to verify. For local testing, expose `localhost:3000` with `cloudflared tunnel --url http://localhost:3000` or `ngrok http 3000`.

Sessions without a date or primary tutor (e.g. office hours) are skipped. A session tagged with both tutors appears on both calendars.

### Accounting sheet

The same webhook and cron also rewrite the **Session Tracker** Google Sheet (`src/lib/accounting-sheet.ts`). Every Notion session with Meeting Type **Session** becomes a row (Date, Student, Tutor, Status, Amount) in its month's tab (`SEP 26`, `OCT 26`, …); missing month tabs are copied from the `Template` tab. Status is copied from Notion (Settled / Outstanding / N/A), Amount is the student's **Session Rate** from the Student Database ($0 when Status is N/A), and each Student cell links to its Notion page. Rows are shaded by tutor and the Status cell by status (`TUTOR_ROW_COLORS` / `STATUS_COLORS`; add a new tutor there). The sync owns the Session Tracking table rows, its size, and the tab's conditional formatting, so edit sessions in Notion, not in the sheet.

1. Enable the **Google Sheets API** in the same Google Cloud project as the service account.
2. Share the spreadsheet with the service account email as **Editor**, and set `GOOGLE_SHEETS_ACCOUNTING_ID` to the ID from its URL (`/spreadsheets/d/<ID>/edit`).

## What not to do

- Do not add a root-level `vercel.json` with `cd dta-app && …` commands. That builds in the subdirectory but makes post-build validation look at the wrong paths on Next.js 16.
- Do not set `STATIC_EXPORT` or `NEXT_PUBLIC_STATIC_EXPORT` on Vercel (GitHub Pages only; see `.github/workflows/github-pages.yml`).

## GitHub Pages (separate)

Static export runs from the `github-pages` branch via GitHub Actions, not from Vercel.
