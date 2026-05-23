/** Server-only Calendly API helpers (Scheduling + availability). */

export type CalendlyErrorBody = {
  message?: string;
  title?: string;
  details?: { message?: string; parameter?: string }[];
};

export type CalendlyConfig = {
  token: string;
  eventUuid: string;
  eventTypeUri: string;
};

export function getCalendlyConfig(): CalendlyConfig | null {
  const token = process.env.CALENDLY_API_TOKEN?.trim();
  const eventUuid = process.env.CALENDLY_EVENT_TYPE_UUID?.trim();
  if (!token || !eventUuid) return null;
  return {
    token,
    eventUuid,
    eventTypeUri: `https://api.calendly.com/event_types/${eventUuid}`,
  };
}

export function calendlyErrorDetail(body: CalendlyErrorBody | undefined): string | undefined {
  return (
    body?.message ??
    body?.title ??
    body?.details?.map((d) => d.message).filter(Boolean).join("; ")
  );
}

export async function calendlyFetch(
  path: string,
  config: CalendlyConfig,
  init?: RequestInit,
): Promise<Response> {
  const url = path.startsWith("http")
    ? path
    : `https://api.calendly.com${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

/** Location kind for POST /invitees when the event type defines a meeting location. */
export async function resolveEventLocationKind(
  config: CalendlyConfig,
): Promise<string | undefined> {
  const override = process.env.CALENDLY_LOCATION_KIND?.trim();
  if (override) return override;

  const res = await calendlyFetch(`/event_types/${config.eventUuid}`, config);
  if (!res.ok) return undefined;

  const data = (await res.json()) as {
    resource?: { locations?: { kind?: string }[] };
  };
  const kinds = (data.resource?.locations ?? [])
    .map((loc) => loc.kind)
    .filter((k): k is string => typeof k === "string" && k.length > 0);

  if (kinds.length === 1) return kinds[0];
  return undefined;
}

export type CreateInviteeResult =
  | {
      ok: true;
      cancelUrl: string;
      rescheduleUrl: string;
      startTime: string;
    }
  | { ok: false; status: number; detail?: string; slotUnavailable?: boolean };

export async function createEventInvitee(
  config: CalendlyConfig,
  input: {
    startTime: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    timezone: string;
  },
): Promise<CreateInviteeResult> {
  const locationKind = await resolveEventLocationKind(config);

  const body: Record<string, unknown> = {
    event_type: config.eventTypeUri,
    start_time: input.startTime,
    invitee: {
      name: input.name,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      timezone: input.timezone,
    },
  };

  if (locationKind) {
    body.location = { kind: locationKind };
  }

  const res = await calendlyFetch("/invitees", config, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errBody: CalendlyErrorBody | undefined;
    try {
      errBody = (await res.json()) as CalendlyErrorBody;
    } catch {
      errBody = undefined;
    }
    const detail = calendlyErrorDetail(errBody);
    const slotUnavailable =
      res.status === 404 ||
      (res.status === 400 &&
        (detail?.toLowerCase().includes("time") ||
          detail?.toLowerCase().includes("available") ||
          errBody?.details?.some((d) => d.parameter === "start_time")));
    return { ok: false, status: res.status, detail, slotUnavailable };
  }

  const data = (await res.json()) as {
    resource?: {
      cancel_url?: string;
      reschedule_url?: string;
      start_time?: string;
    };
  };

  const resource = data.resource;
  const cancelUrl = resource?.cancel_url;
  const rescheduleUrl = resource?.reschedule_url;
  const startTime = resource?.start_time ?? input.startTime;

  if (!cancelUrl || !rescheduleUrl) {
    return {
      ok: false,
      status: 502,
      detail: "Booking succeeded but confirmation links were missing.",
    };
  }

  return { ok: true, cancelUrl, rescheduleUrl, startTime };
}
