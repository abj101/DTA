import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { isAccountable } from "@/lib/accounting-rows";
import { applyBackfill, ledgerCounts, planBackfill } from "@/lib/charges-backfill";
import { dashless } from "@/lib/charges";
import { chargesBySession } from "@/lib/notion-charges";
import { querySessions } from "@/lib/notion-sessions";
import { syncAllSessionSheets } from "@/lib/accounting-sheet";
import { reconcileAllCharges, syncAllCalendars } from "@/lib/session-sync";
import {
  applyStatusMigration,
  planStatusMigration,
} from "@/lib/session-status-migration";
import { accessiblePages, createChargesDatabase, makeChargesInline } from "@/lib/charges-setup";

export const maxDuration = 300;

function authorized(header: string | null, token: string): boolean {
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(`Bearer ${token}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Read-only dry run of the Session Charges backfill, for running where the Sensitive env
 * vars live. Disabled unless BACKFILL_TOKEN is set on the deployment. GET never writes.
 * `?since=YYYY-MM-DD` limits sessions; `?format=csv` returns the report itself.
 */
/** Null when the request may proceed; otherwise the response to send. */
function guard(req: Request): NextResponse | null {
  const token = process.env.BACKFILL_TOKEN?.trim();
  if (!token) return NextResponse.json({ ok: false, error: "Not enabled." }, { status: 404 });
  if (!authorized(req.headers.get("authorization"), token)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const since = new Date(url.searchParams.get("since") ?? "2000-01-01");
  try {
    if (url.searchParams.get("action") === "verify") {
      return NextResponse.json({ ok: true, ...(await verifyLinks()) });
    }
    if (url.searchParams.get("action") === "count") {
      return NextResponse.json({ ok: true, ...(await ledgerCounts()) });
    }
    if (url.searchParams.get("action") === "status-migration") {
      return NextResponse.json({ ok: true, ...(await planStatusMigration()) });
    }
    if (url.searchParams.get("action") === "pages") {
      return NextResponse.json({ ok: true, pages: await accessiblePages() });
    }
    const plan = await planBackfill(since);
    if (url.searchParams.get("format") === "csv") {
      return new Response(plan.csv, { headers: { "content-type": "text/csv; charset=utf-8" } });
    }
    return NextResponse.json({
      ok: true,
      wouldCreate: plan.creates.length,
      alreadyExist: plan.existingCount,
      flagged: plan.flagged,
      warnings: plan.warnings,
    });
  } catch (error) {
    console.error("[charges-backfill] dry run failed", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

/**
 * Writes, so POST only: `?action=create-db` creates the Session Charges database (refuses
 * when NOTION_CHARGES_DATA_SOURCE_ID is already set); `?action=apply` creates the planned
 * charges, skipping any that already exist; `?action=inline` shows the ledger inline in its page.
 */
export async function POST(req: Request) {
  const denied = guard(req);
  if (denied) return denied;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  try {
    if (action === "create-db") {
      if (process.env.NOTION_CHARGES_DATA_SOURCE_ID?.trim()) {
        return NextResponse.json(
          { ok: false, error: "NOTION_CHARGES_DATA_SOURCE_ID is already set." },
          { status: 409 },
        );
      }
      const parent = url.searchParams.get("parent") ?? undefined;
      return NextResponse.json({ ok: true, ...(await createChargesDatabase(parent)) });
    }
    if (action === "resync-all") {
      // Every date, once: rebuilds all sheet months and calendar events from Notion.
      const since = new Date("2000-01-01");
      const sheets = await syncAllSessionSheets(since);
      const calendars = await syncAllCalendars(since);
      return NextResponse.json({ ok: true, sheets, calendars: { ...calendars, skipped: calendars.skipped.length } });
    }
    if (action === "status-migration") {
      const migration = await applyStatusMigration();
      // Fill every billed session's status columns from its charges (all dates, once).
      const reconciled = await reconcileAllCharges(new Date("2000-01-01"));
      return NextResponse.json({ ok: true, ...migration, reconciled });
    }
    if (action === "inline") {
      return NextResponse.json({ ok: true, ...(await makeChargesInline()) });
    }
    if (action === "apply") {
      const plan = await planBackfill(new Date(url.searchParams.get("since") ?? "2000-01-01"));
      const created = await applyBackfill(plan);
      return NextResponse.json({ ok: true, created, alreadyExisted: plan.existingCount });
    }
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error(`[charges-backfill] ${action} failed`, error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

/** Read-only cross-check: every billed session's status columns against its charges. */
async function verifyLinks() {
  const [sessions, ledger] = await Promise.all([
    querySessions(new Date("2000-01-01")),
    chargesBySession(),
  ]);
  const statusCounts: Record<string, number> = {};
  const problems: string[] = [];
  const multi: { title: string; columns: (string | null)[]; payment: string | null }[] = [];
  let billed = 0;
  for (const session of sessions.filter(isAccountable)) {
    billed++;
    const charges = ledger.get(dashless(session.pageId)) ?? [];
    session.studentIds.forEach((id, i) => {
      const charge = charges.find((c) => dashless(c.studentId) === dashless(id));
      if (!charge) problems.push(`${session.title} ${session.start}: no charge for ${session.students[i]}`);
      const status = charge?.status ?? "";
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
      if ((session.statusColumns[i] ?? "") !== status) {
        problems.push(`${session.title} ${session.start}: column ${i + 1} ${session.statusColumns[i]} vs charge ${status}`);
      }
    });
    if (session.studentIds.length > 1) {
      multi.push({ title: session.title, columns: session.statusColumns, payment: session.payment });
    }
  }
  const legacy = sessions.filter((s) => s.statusColumns.includes("N/A")).length;
  return { billed, statusCounts, problems, legacyNA: legacy, multiStudent: multi };
}
