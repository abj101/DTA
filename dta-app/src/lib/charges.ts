import type { PageObjectResponse } from "@notionhq/client";

/*
 * Pure rules for the "Session Charges" ledger (no I/O, no runtime imports, so the plain-node
 * self-checks and the backfill script can load this file directly). One charge exists per
 * session x student; the Notion layer (notion-charges.ts) applies what these functions decide.
 */

/** Property names in the Notion "Session Charges" data source. */
export const CHARGE_PROPS = {
  title: "Charge",
  session: "Session",
  student: "Student",
  key: "Key",
  standardRate: "Standard Rate",
  adjustedRate: "Adjusted Rate",
  status: "Status",
  note: "Note",
  studentRemoved: "Student Removed",
  /** Session date (app-managed), so the ledger can be split into month views. */
  date: "Date",
  /** Last session Status the app copied onto this charge (hidden; app-managed). */
  sessionStatusApplied: "Session Status Applied",
} as const;

export const STATUS_OUTSTANDING = "Outstanding";

/** One charge page, as the app understands it. */
export type Charge = {
  pageId: string;
  url: string;
  createdTime: string;
  sessionId: string;
  studentId: string;
  /** Dashless `<sessionPageId>:<studentPageId>`. */
  key: string;
  title: string;
  /** App-managed snapshot of the student's rate. */
  standardRate: number | null;
  /** User-only override; the app never writes it. */
  adjustedRate: number | null;
  status: string | null;
  note: string;
  studentRemoved: boolean;
  /** YYYY-MM-DD, or "" when never set. */
  date: string;
  sessionStatusApplied: string;
};

/** The fields the app manages on a charge; everything else belongs to the user. */
export type ManagedFields = {
  title: string;
  standardRate: number | null;
  studentRemoved: boolean;
  date: string;
  /** Payment status; the app only changes it when the session's own Status changes. */
  status: string | null;
  sessionStatusApplied: string;
};

export function dashless(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

export function chargeKey(sessionId: string, studentId: string): string {
  return `${dashless(sessionId)}:${dashless(studentId)}`;
}

export function chargeTitle(student: string, ymd: string): string {
  return `${student} — ${ymd}`;
}

/** The student name a title was built with (used only for students no longer on the session). */
export function titleStudent(title: string): string {
  return title.split(" — ")[0]?.trim() ?? "";
}

function ymdInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Pacific calendar day (YYYY-MM-DD) a Notion date or datetime falls on. */
export function sessionYmdIn(start: string, timeZone: string): string {
  return start.length === 10 ? start : ymdInTimeZone(new Date(start), timeZone);
}

/** A session is past once its calendar day (in `timeZone`) is before today's. */
export function sessionHasPassed(start: string, now: Date, timeZone: string): boolean {
  return sessionYmdIn(start, timeZone) < ymdInTimeZone(now, timeZone);
}

/**
 * The Standard Rate a charge should hold. A blank field snapshots the student's current
 * rate (once, even for past sessions). While the session is still ahead the field follows
 * the current rate; after it has passed the stored value is frozen.
 */
export function targetStandardRate(
  existing: number | null,
  currentRate: number | null,
  passed: boolean,
): number | null {
  if (existing == null) return currentRate;
  if (passed || currentRate == null) return existing;
  return currentRate;
}

/** Adjusted Rate overrides Standard Rate; null means the amount is blank. */
export function chargeRate(adjusted: number | null, standard: number | null): number | null {
  return adjusted ?? standard;
}

/**
 * The Status a charge should hold. A change to the session's Status is copied onto every
 * one of its charges; otherwise the charge keeps its own (possibly individually edited)
 * Status. A cleared session Status never clears a charge.
 */
export function targetStatus(
  existing: { status: string | null; sessionStatusApplied: string } | null,
  sessionStatus: string | null,
): { status: string | null; sessionStatusApplied: string } {
  const applied = sessionStatus ?? "";
  if (!existing) return { status: sessionStatus ?? STATUS_OUTSTANDING, sessionStatusApplied: applied };
  if (applied === existing.sessionStatusApplied) return existing;
  return { status: sessionStatus ?? existing.status, sessionStatusApplied: applied };
}

/** The app-managed fields a charge should hold given the live session and student. */
export function desiredFields(
  existing: Charge | null,
  input: {
    title: string;
    currentRate: number | null;
    passed: boolean;
    ymd: string;
    sessionStatus: string | null;
  },
): ManagedFields {
  const { status, sessionStatusApplied } = targetStatus(
    existing && { status: existing.status, sessionStatusApplied: existing.sessionStatusApplied },
    input.sessionStatus,
  );
  return {
    title: input.title,
    standardRate: targetStandardRate(existing?.standardRate ?? null, input.currentRate, input.passed),
    studentRemoved: false,
    date: input.ymd,
    status,
    sessionStatusApplied,
  };
}

/** A removed student's kept charge: everything as stored, plus the Student Removed flag. */
export function flaggedFields(charge: Charge): ManagedFields {
  return {
    title: charge.title,
    standardRate: charge.standardRate,
    studentRemoved: true,
    date: charge.date,
    status: charge.status,
    sessionStatusApplied: charge.sessionStatusApplied,
  };
}

/** The managed fields that differ from the stored charge; empty means skip the write. */
export function diffFields(charge: Charge, desired: ManagedFields): Partial<ManagedFields> {
  const patch: Partial<ManagedFields> = {};
  if (charge.title !== desired.title) patch.title = desired.title;
  if (charge.standardRate !== desired.standardRate) patch.standardRate = desired.standardRate;
  if (charge.studentRemoved !== desired.studentRemoved) {
    patch.studentRemoved = desired.studentRemoved;
  }
  if (desired.date && charge.date !== desired.date) patch.date = desired.date;
  if (desired.status != null && charge.status !== desired.status) patch.status = desired.status;
  if (charge.sessionStatusApplied !== desired.sessionStatusApplied) {
    patch.sessionStatusApplied = desired.sessionStatusApplied;
  }
  return patch;
}

/** True once a user has touched the charge (adjusted it, annotated it, or moved its status). */
export function hasUserEdits(charge: Charge): boolean {
  return (
    charge.adjustedRate != null ||
    charge.note.trim() !== "" ||
    (charge.status != null && charge.status !== STATUS_OUTSTANDING)
  );
}

/** Untouched charges of a removed student are trashed; edited ones are kept and flagged. */
export function removalAction(charge: Charge): "trash" | "flag" {
  return hasUserEdits(charge) ? "flag" : "trash";
}

/** Among duplicates (same Key), keeps the most user-edited, then the oldest. */
export function pickSurvivor(charges: Charge[]): { keep: Charge; discard: Charge[] } {
  const score = (c: Charge) =>
    (c.adjustedRate != null ? 1 : 0) +
    (c.note.trim() ? 1 : 0) +
    (c.status != null && c.status !== STATUS_OUTSTANDING ? 1 : 0);
  const ranked = [...charges].sort(
    (a, b) => score(b) - score(a) || a.createdTime.localeCompare(b.createdTime),
  );
  return { keep: ranked[0], discard: ranked.slice(1) };
}

/** User fields the survivor lacks but a discarded duplicate has, so no edit is lost. */
export function mergeUserFields(
  keep: Charge,
  discard: Charge[],
): { adjustedRate?: number; note?: string; status?: string } {
  const patch: { adjustedRate?: number; note?: string; status?: string } = {};
  for (const other of discard) {
    if (keep.adjustedRate == null && patch.adjustedRate === undefined && other.adjustedRate != null) {
      patch.adjustedRate = other.adjustedRate;
    }
    if (!keep.note.trim() && patch.note === undefined && other.note.trim()) {
      patch.note = other.note;
    }
    if (
      (keep.status == null || keep.status === STATUS_OUTSTANDING) &&
      patch.status === undefined &&
      other.status != null &&
      other.status !== STATUS_OUTSTANDING
    ) {
      patch.status = other.status;
    }
  }
  return patch;
}

/* ---- Notion page <-> Charge translation (pure) ---- */

type NotionProps = PageObjectResponse["properties"];

const richText = (parts: { plain_text: string }[]) => parts.map((t) => t.plain_text).join("");

/** Parses a Charge database page; null when it lacks the Session or Student relation. */
export function chargeFromPage(page: {
  id: string;
  url: string;
  created_time: string;
  properties: NotionProps;
}): Charge | null {
  const p = page.properties;
  const rel = (name: string) => {
    const prop = p[name];
    return prop?.type === "relation" ? (prop.relation[0]?.id ?? "") : "";
  };
  const num = (name: string) => {
    const prop = p[name];
    return prop?.type === "number" ? prop.number : null;
  };
  const sessionId = rel(CHARGE_PROPS.session);
  const studentId = rel(CHARGE_PROPS.student);
  if (!sessionId || !studentId) return null;
  const title = p[CHARGE_PROPS.title];
  const status = p[CHARGE_PROPS.status];
  const note = p[CHARGE_PROPS.note];
  const removed = p[CHARGE_PROPS.studentRemoved];
  const date = p[CHARGE_PROPS.date];
  const applied = p[CHARGE_PROPS.sessionStatusApplied];
  return {
    pageId: page.id,
    url: page.url,
    createdTime: page.created_time,
    sessionId,
    studentId,
    // Derived from the relations so a hand-edited Key cannot defeat dedupe.
    key: chargeKey(sessionId, studentId),
    title: title?.type === "title" ? richText(title.title) : "",
    standardRate: num(CHARGE_PROPS.standardRate),
    adjustedRate: num(CHARGE_PROPS.adjustedRate),
    status: status?.type === "select" ? (status.select?.name ?? null) : null,
    note: note?.type === "rich_text" ? richText(note.rich_text) : "",
    studentRemoved: removed?.type === "checkbox" ? removed.checkbox : false,
    date: date?.type === "date" ? (date.date?.start.slice(0, 10) ?? "") : "",
    sessionStatusApplied: applied?.type === "rich_text" ? richText(applied.rich_text) : "",
  };
}

type PropertyValues = Record<string, unknown>;

/** Notion property payload for the managed fields in `fields` (only those present). */
export function managedProperties(fields: Partial<ManagedFields>): PropertyValues {
  const props: PropertyValues = {};
  if (fields.title !== undefined) {
    props[CHARGE_PROPS.title] = { title: [{ text: { content: fields.title } }] };
  }
  if (fields.standardRate !== undefined) {
    props[CHARGE_PROPS.standardRate] = { number: fields.standardRate };
  }
  if (fields.studentRemoved !== undefined) {
    props[CHARGE_PROPS.studentRemoved] = { checkbox: fields.studentRemoved };
  }
  if (fields.date) props[CHARGE_PROPS.date] = { date: { start: fields.date } };
  if (fields.status != null) props[CHARGE_PROPS.status] = { select: { name: fields.status } };
  if (fields.sessionStatusApplied !== undefined) {
    props[CHARGE_PROPS.sessionStatusApplied] = {
      rich_text: fields.sessionStatusApplied
        ? [{ text: { content: fields.sessionStatusApplied } }]
        : [],
    };
  }
  return props;
}

/** Full property payload for a brand-new charge. */
export function newChargeProperties(args: {
  sessionId: string;
  studentId: string;
  fields: ManagedFields;
}): PropertyValues {
  return {
    ...managedProperties(args.fields),
    [CHARGE_PROPS.session]: { relation: [{ id: args.sessionId }] },
    [CHARGE_PROPS.student]: { relation: [{ id: args.studentId }] },
    [CHARGE_PROPS.key]: {
      rich_text: [{ text: { content: chargeKey(args.sessionId, args.studentId) } }],
    },
  };
}

/**
 * Standard Rate seed for a backfilled charge. The sheet amount wins because old months may
 * hold historical rates, except for N/A sessions, whose sheet amount is a masked $0.
 */
export function backfillSeed(
  status: string | null,
  sheetAmount: number | null,
  currentRate: number | null,
): { seed: number | null; mismatch: boolean } {
  if (status === "N/A") return { seed: currentRate, mismatch: false };
  return {
    seed: sheetAmount ?? currentRate,
    mismatch: sheetAmount != null && currentRate != null && sheetAmount !== currentRate,
  };
}
