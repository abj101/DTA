/** Helpers for calendar-day boundaries in America/Los_Angeles (Tri-Valley scheduling). */

export const DTA_SCHEDULE_TZ = "America/Los_Angeles";

const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function formatYmdInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) {
    throw new Error("Unable to format date in time zone");
  }
  return `${y}-${m}-${d}`;
}

function zonedYmd(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const y = parts.find((p) => p.type === "year")!.value;
  const mo = parts.find((p) => p.type === "month")!.value;
  const da = parts.find((p) => p.type === "day")!.value;
  return `${y}-${mo}-${da}`;
}

/** UTC ISO bounds covering the full calendar day in `timeZone` for `ymd` (YYYY-MM-DD). */
export function zonedDayUtcIsoRange(
  ymd: string,
  timeZone: string,
): { start: string; end: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error("Invalid date format");
  }
  const [yStr, mStr, dStr] = ymd.split("-");
  const y = Number(yStr);
  const mo = Number(mStr);
  const d = Number(dStr);
  if ([y, mo, d].some((n) => Number.isNaN(n))) {
    throw new Error("Invalid date parts");
  }

  let ms = Date.UTC(y, mo - 1, d, 15, 0, 0);
  const maxSteps = 96 * 60;
  let steps = 0;

  while (steps < maxSteps && zonedYmd(ms - 60_000, timeZone) === ymd) {
    ms -= 60_000;
    steps++;
  }
  steps = 0;
  while (steps < maxSteps && zonedYmd(ms, timeZone) !== ymd) {
    ms += 60_000;
    steps++;
  }
  const startMs = ms;

  steps = 0;
  while (steps < maxSteps && zonedYmd(ms + 60_000, timeZone) === ymd) {
    ms += 60_000;
    steps++;
  }
  const endMs = ms + 59_999;

  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  };
}

export function getZonedWeekdaySun0(date: Date, timeZone: string): number {
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(date);
  const idx = WEEKDAY_LONG.indexOf(dayName as (typeof WEEKDAY_LONG)[number]);
  return idx === -1 ? 0 : idx;
}
