import type { Session } from "./notion-sessions";

/** Notion Status value for free sessions; they are listed with a $0 amount. */
export const FREE_STATUS = "N/A";

/** One accounting row: a session paired with a single one of its students. */
export type AccountingRow = {
  session: Session;
  student: string;
  /** That student's Session Rate; null leaves the amount cell blank. */
  rate: number | null;
};

/**
 * Expands sessions into one row per student so each student's rate is accounted on
 * its own row. A session with no students still yields a single blank row.
 */
export function sessionRows(sessions: Session[]): AccountingRow[] {
  return sessions.flatMap((session) =>
    session.students.length === 0
      ? [{ session, student: "", rate: null }]
      : session.students.map((student, index) => ({
          session,
          student,
          rate: session.studentRates[index] ?? null,
        })),
  );
}

/** A row's amount: free sessions are $0, otherwise the student's own rate (null = blank). */
export function rowAmount({ session, rate }: AccountingRow): number | null {
  return session.status === FREE_STATUS ? 0 : rate;
}
