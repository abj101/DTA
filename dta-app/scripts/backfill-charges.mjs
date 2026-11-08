// Seeds the Notion "Session Charges" database from existing sessions.
//
// Dry run (default, writes NOTHING to Notion; only a local CSV report):
//   node --experimental-strip-types --no-warnings scripts/backfill-charges.mjs [report.csv] [--since=YYYY-MM-DD]
// Create the charges (after reviewing the CSV):
//   node --experimental-strip-types --no-warnings scripts/backfill-charges.mjs --apply
//
// Reads NOTION_API_KEY, NOTION_SESSIONS_DATA_SOURCE_ID, NOTION_CHARGES_DATA_SOURCE_ID (required
// for --apply) and, to seed historical amounts, the Google Sheets variables from .env.local.
// The same dry run can run on Vercel via GET /api/admin/charges-backfill.
import { writeFileSync } from "node:fs";

import { applyBackfill, planBackfill } from "../src/lib/charges-backfill.ts";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Variables may already be in the environment.
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const since = new Date(args.find((a) => a.startsWith("--since="))?.slice(8) ?? "2000-01-01");
const out = args.find((a) => !a.startsWith("--")) ?? "backfill-charges-report.csv";

for (const name of ["NOTION_API_KEY", "NOTION_SESSIONS_DATA_SOURCE_ID"]) {
  if (!process.env[name]?.trim()) {
    console.error(`${name} is not set (put it in .env.local).`);
    process.exit(1);
  }
}

const plan = await planBackfill(since);
for (const warning of plan.warnings) console.warn(warning);
writeFileSync(out, plan.csv);
console.log(
  `${plan.creates.length} charge(s) ${apply ? "to create" : "would be created"}; ` +
    `${plan.existingCount} already exist; ${plan.flagged.mismatch} MISMATCH, ` +
    `${plan.flagged.noRate} NO_RATE. Report: ${out}`,
);

if (!apply) {
  console.log("Dry run: nothing was written to Notion. Re-run with --apply to create them.");
} else {
  const done = await applyBackfill(plan, (n, total) => {
    if (n % 25 === 0) console.log(`  created ${n}/${total}`);
  });
  console.log(`Created ${done} charge(s).`);
}
