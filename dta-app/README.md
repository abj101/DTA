This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Session Charges (billing ledger)

Billing lives in a Notion **Session Charges** database, one page per session x student. The app maintains the charges from the Session Calendar and Student Database, and the accounting Google Sheet is a report rebuilt from them. Edit billing only in Notion.

### Create the database

In Notion create a database named **Session Charges** (put it next to the Session Calendar) with these properties, using the exact names:

| Property | Type | Who writes it |
| --- | --- | --- |
| Charge | Title | app (`<Student> — <date>`) |
| Session | Relation to Session Calendar | app |
| Student | Relation to Student Database | app |
| Key | Text | app (`<sessionId>:<studentId>`, dashless; dedupe key) |
| Standard Rate | Number | app (snapshot of the student's Session Rate) |
| Adjusted Rate | Number | **you**, optional; the app never writes it |
| Status | Select with options `Settled`, `Outstanding`, `Free` | **you**, here or in the session's matching status column; new charges start `Outstanding` (or the session column's value) |
| Date | Date | app (the session's day; drives the month tabs) |
| Note | Text | you |
| Student Removed | Checkbox | app |

Then share the database with the Notion integration (`•••` > Connections), and set `NOTION_CHARGES_DATA_SOURCE_ID` (data source ID, or the database ID from its URL). The relations may be one-way (no need for reverse properties). Webhook events for the Charges and Student databases come through the same subscription, so no extra setup is needed.

### Rules

- Amount = Adjusted Rate if set, else Standard Rate; Status `Free` means $0.
- Each billed session has one status column per student, by their position in its Student list: **Status** (1st), **Status 2** (2nd), and so on. Each is synced both ways with that student's charge: edit either and the other follows. A hidden **Status Sync** column records what was last synced, so the app can tell which side you changed; if the Student list changes, the columns are refilled from the charges. Google Calendar events show a **Payment** line summarising them: `Settled` when everyone matches, otherwise `Ana Lee: Settled · Ben Ng: Outstanding` (sessions no longer have a Payment column; the setup migration removes the old one). Free sessions use **Free** (formerly N/A).
- The table has an **All** tab plus one tab per month, added automatically when a month gets its first charge. Columns: Student, Status, Standard Rate, Adjusted Rate, then the rest.
- Standard Rate follows the student's current Session Rate while the session is in the future, and is frozen once the session date has passed. Clear it to re-snapshot the current rate on the next sync.
- Removing a student from a session trashes their charge if untouched (Outstanding, no Adjusted Rate, no Note); otherwise the charge stays with **Student Removed** checked.
- Duplicate charges for one session x student are merged by the daily cron, keeping the one with your edits.
- Sheet rows link to the charge page. Until `NOTION_CHARGES_DATA_SOURCE_ID` is set, the sheet keeps the legacy behaviour.

### Migrating existing sessions

```
node --experimental-strip-types --no-warnings scripts/backfill-charges.mjs report.csv   # dry run, writes nothing to Notion
node --experimental-strip-types --no-warnings scripts/backfill-charges.mjs --apply      # creates the charges
```

The dry run lists every charge it would create, seeding Standard Rate from the amount currently in the sheet (so past months keep their historical rates) and falling back to the current Session Rate; rows where the two differ are flagged `MISMATCH`. Review the CSV before `--apply`. Self-checks: `node --experimental-strip-types --no-warnings scripts/check-charges.mjs` and `scripts/check-accounting-rows.mjs`.
