import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { planBackfill } from "@/lib/charges-backfill";

export const maxDuration = 300;

function authorized(header: string | null, token: string): boolean {
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(`Bearer ${token}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Read-only dry run of the Session Charges backfill, for running where the Sensitive env
 * vars live. Disabled unless BACKFILL_TOKEN is set on the deployment. Never writes.
 * `?since=YYYY-MM-DD` limits sessions; `?format=csv` returns the report itself.
 */
export async function GET(req: Request) {
  const token = process.env.BACKFILL_TOKEN?.trim();
  if (!token) return NextResponse.json({ ok: false, error: "Not enabled." }, { status: 404 });
  if (!authorized(req.headers.get("authorization"), token)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

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
