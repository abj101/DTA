import type { Charge } from "./charges";
import type { Session } from "./notion-sessions";

/** Notion Status value for free sessions; they are listed with a $0 amount. */
export const FREE_STATUS = "N/A";

/** One accounting row: a session paired with a single one of its students. */
export type AccountingRow = {
  session: Session;
  student: string;
  /** The rate the amount derives from; null leaves the amount cell blank. */
  rate: number | null;
  /** Payment status shown on the row. */
  status: string | null;
  /** Notion page the Student cell links to (the charge, or the session before it exists). */
  url: string;
};

/**
 * Legacy rows, used before the Charges database exists (or for a student whose charge has
 * not been created yet): the session's shared Status and the student's live Session Rate.
 */
export function sessionRows(sessions: Session[]): AccountingRow[] {
  return sessions.flatMap((session) =>
    session.students.length === 0
      ? [{ session, student: "", rate: null, status: session.status, url: session.url }]
      : session.students.map((student, index) => ({
          session,
          student,
          rate: session.studentRates[index] ?? null,
          status: session.status,
          url: session.url,
        })),
  );
}

/**
 * Rows built from the ledger: one per charge. A session student with no charge yet falls
 * back to a legacy row; charges of students no longer on the session (kept because a user
 * edited them) follow, flagged by their title's student name.
 */
export function chargeRows(
  sessions: Session[],
  chargesBySession: Map<string, Charge[]>,
): AccountingRow[] {
  return sessions.flatMap((session) => {
    const charges = chargesBySession.get(session.pageId.replace(/-/g, "").toLowerCase()) ?? [];
    const byStudent = new Map(charges.map((c) => [c.studentId.replace(/-/g, "").toLowerCase(), c]));
    const rows: AccountingRow[] = session.students.map((student, index) => {
      const charge = byStudent.get(session.studentIds[index].replace(/-/g, "").toLowerCase());
      if (!charge) {
        return {
          session,
          student,
          rate: session.studentRates[index] ?? null,
          status: session.status,
          url: session.url,
        };
      }
      byStudent.delete(session.studentIds[index].replace(/-/g, "").toLowerCase());
      return chargeRow(session, student, charge);
    });
    for (const charge of byStudent.values()) {
      rows.push(chargeRow(session, charge.title.split(" — ")[0]?.trim() ?? "", charge));
    }
    return rows.length > 0
      ? rows
      : [{ session, student: "", rate: null, status: session.status, url: session.url }];
  });
}

function chargeRow(session: Session, student: string, charge: Charge): AccountingRow {
  return {
    session,
    student,
    rate: charge.adjustedRate ?? charge.standardRate,
    status: charge.status,
    url: charge.url,
  };
}

/** A row's amount: free (N/A) rows are $0, otherwise the rate (null = blank). */
export function rowAmount({ status, rate }: AccountingRow): number | null {
  return status === FREE_STATUS ? 0 : rate;
}

/** Only sessions of this Meeting Type are accounted (sheet rows and charges). */
export const ACCOUNTED_MEETING_TYPE = "Session";

/** A live, dated session of the accounted Meeting Type. */
export function isAccountable(session: Session): boolean {
  return !session.deleted && session.meetingType === ACCOUNTED_MEETING_TYPE && !!session.start;
}
