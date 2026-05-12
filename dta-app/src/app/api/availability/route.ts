import { NextRequest, NextResponse } from "next/server";

import {
  DTA_SCHEDULE_TZ,
  zonedDayUtcIsoRange,
} from "@/lib/pacific-date";

type CalendlyErrorBody = {
  message?: string;
  title?: string;
  details?: { message?: string; parameter?: string }[];
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const token = process.env.CALENDLY_API_TOKEN;
  const eventUuid = process.env.CALENDLY_EVENT_TYPE_UUID;

  if (!token || !eventUuid) {
    return NextResponse.json(
      {
        error:
          "Scheduling is not configured (missing CALENDLY_API_TOKEN or CALENDLY_EVENT_TYPE_UUID)",
      },
      { status: 503 },
    );
  }

  let startTime: string;
  let endTime: string;
  try {
    const range = zonedDayUtcIsoRange(date, DTA_SCHEDULE_TZ);
    const nowPlusBufferIso = new Date(Date.now() + 60_000).toISOString();
    if (range.end <= nowPlusBufferIso) {
      return NextResponse.json({ slots: [] });
    }
    startTime = range.start < nowPlusBufferIso ? nowPlusBufferIso : range.start;
    endTime = range.end;
  } catch {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const eventTypeUri = `https://api.calendly.com/event_types/${eventUuid}`;

  type FetchResult =
    | { ok: true; collection: { start_time?: string }[] }
    | {
        ok: false;
        status: number;
        body: CalendlyErrorBody | undefined;
        transient: boolean;
      };

  async function fetchAvailability(
    start: string,
    end: string,
  ): Promise<FetchResult> {
    const url =
      "https://api.calendly.com/event_type_available_times" +
      `?event_type=${encodeURIComponent(eventTypeUri)}` +
      `&start_time=${encodeURIComponent(start)}` +
      `&end_time=${encodeURIComponent(end)}`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
    } catch {
      return { ok: false, status: 0, body: undefined, transient: true };
    }

    if (res.ok) {
      const data = (await res.json()) as {
        collection?: { start_time?: string }[];
      };
      return { ok: true, collection: data.collection ?? [] };
    }

    let body: CalendlyErrorBody | undefined;
    try {
      body = (await res.json()) as CalendlyErrorBody;
    } catch {
      body = undefined;
    }

    // Treat 5xx, 429, and generic-400 "Invalid Argument" without a specific
    // parameter as transient: Calendly returns these intermittently for the
    // same valid input. Configuration errors (401/403, or 400s that name a
    // specific bad parameter) are NOT transient.
    const isServerError = res.status >= 500;
    const isRateLimit = res.status === 429;
    const namesBadParameter = body?.details?.some(
      (d) => typeof d.parameter === "string" && d.parameter.length > 0,
    );
    const isGenericInvalidArg =
      res.status === 400 &&
      body?.title === "Invalid Argument" &&
      !namesBadParameter;

    return {
      ok: false,
      status: res.status,
      body,
      transient: isServerError || isRateLimit || isGenericInvalidArg,
    };
  }

  async function fetchWithRetry(start: string, end: string): Promise<FetchResult> {
    const delays = [0, 350, 900];
    let last: FetchResult = {
      ok: false,
      status: 0,
      body: undefined,
      transient: true,
    };
    for (const delay of delays) {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      last = await fetchAvailability(start, end);
      if (last.ok) return last;
      if (!last.transient) return last;
    }
    return last;
  }

  let result = await fetchWithRetry(startTime, endTime);

  if (
    !result.ok &&
    result.status === 400 &&
    result.body?.details?.some(
      (d) =>
        d.parameter === "start_time" &&
        typeof d.message === "string" &&
        d.message.toLowerCase().includes("future"),
    )
  ) {
    const retryStart = new Date(Date.now() + 5 * 60_000).toISOString();
    if (retryStart < endTime) {
      startTime = startTime < retryStart ? retryStart : startTime;
      result = await fetchWithRetry(startTime, endTime);
    }
  }

  if (!result.ok) {
    const detail =
      result.body?.message ??
      result.body?.title ??
      result.body?.details?.map((d) => d.message).filter(Boolean).join("; ");
    console.error(
      "[availability] Calendly API error",
      JSON.stringify(
        {
          status: result.status,
          detail,
          body: result.body,
          date,
          startTime,
          endTime,
        },
        null,
        2,
      ),
    );
    return NextResponse.json(
      { error: "Calendly API error", detail, status: result.status },
      { status: 502 },
    );
  }

  const slots = result.collection
    .map((s) => s.start_time)
    .filter((t): t is string => typeof t === "string");

  return NextResponse.json({ slots });
}
