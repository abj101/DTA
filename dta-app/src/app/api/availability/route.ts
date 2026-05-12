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
  async function fetchAvailability(start: string, end: string) {
    const url =
      "https://api.calendly.com/event_type_available_times" +
      `?event_type=${encodeURIComponent(eventTypeUri)}` +
      `&start_time=${encodeURIComponent(start)}` +
      `&end_time=${encodeURIComponent(end)}`;
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });
  }

  let res = await fetchAvailability(startTime, endTime);

  if (!res.ok) {
    let errBody: CalendlyErrorBody | undefined;
    try {
      errBody = (await res.json()) as CalendlyErrorBody;
    } catch {
      errBody = undefined;
    }

    const hasStartTimeInvalid =
      res.status === 400 &&
      errBody?.details?.some(
        (d) =>
          d.parameter === "start_time" &&
          typeof d.message === "string" &&
          d.message.toLowerCase().includes("future"),
      );

    if (hasStartTimeInvalid) {
      const retryStart = new Date(Date.now() + 5 * 60_000).toISOString();
      if (retryStart < endTime) {
        startTime = startTime < retryStart ? retryStart : startTime;
        res = await fetchAvailability(startTime, endTime);
      }
    }
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const errBody = (await res.json()) as CalendlyErrorBody;
      detail = errBody.message ?? errBody.title;
    } catch {
      detail = undefined;
    }
    return NextResponse.json(
      { error: "Calendly API error", detail },
      { status: 502 },
    );
  }

  const data = (await res.json()) as {
    collection?: { start_time?: string }[];
  };
  const slots =
    data.collection
      ?.map((s) => s.start_time)
      .filter((t): t is string => typeof t === "string") ?? [];

  return NextResponse.json({ slots });
}
