import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { applyBackfill, planBackfill } from "@/lib/charges-backfill";
import { createChargesDatabase } from "@/lib/charges-setup";

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
 * charges, skipping any that already exist.
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
      return NextResponse.json({ ok: true, ...(await createChargesDatabase()) });
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
