export type IcsInvite = {
  uid: string;
  start: string;
  end: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
};

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 caps content lines at 75 octets; continuation lines start with a space. */
function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  out.push(rest);
  return out.join("\r\n");
}

export function buildIcs(invite: IcsInvite): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dublin Tutoring Association//Office Hours//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${invite.uid}`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(invite.start)}`,
    `DTEND:${icsDate(invite.end)}`,
    `SUMMARY:${icsText(invite.summary)}`,
    invite.description ? `DESCRIPTION:${icsText(invite.description)}` : null,
    invite.location ? `LOCATION:${icsText(invite.location)}` : null,
    invite.url ? `URL:${invite.url}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export function downloadIcs(filename: string, invite: IcsInvite) {
  const blob = new Blob([buildIcs(invite)], { type: "text/calendar;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 0);
}
