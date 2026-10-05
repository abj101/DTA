// Run: node scripts/check-accounting-rows.mjs
import assert from "node:assert/strict";

import { FREE_STATUS, rowAmount, sessionRows } from "../src/lib/accounting-rows.ts";

const session = (over = {}) => ({
  pageId: "p",
  url: "https://notion.so/p",
  deleted: false,
  title: "T",
  start: "2026-09-10",
  end: null,
  timeZone: null,
  tutors: ["Ayush Bakhandi"],
  students: [],
  studentRates: [],
  meetingType: "Session",
  meetingTypeColor: null,
  status: null,
  details: [],
  ...over,
});

// One row per student, each carrying its own rate.
const multi = session({ students: ["Ana", "Ben"], studentRates: [60, 75] });
assert.deepEqual(
  sessionRows([multi]).map((r) => [r.student, rowAmount(r)]),
  [
    ["Ana", 60],
    ["Ben", 75],
  ],
);

// A missing rate blanks only that student's amount.
assert.deepEqual(
  sessionRows([session({ students: ["Ana", "Ben"], studentRates: [60, null] })]).map(rowAmount),
  [60, null],
);

// Free sessions are $0 per student; a student-less session keeps one blank row.
assert.deepEqual(
  sessionRows([
    session({ status: FREE_STATUS, students: ["Ana"], studentRates: [60] }),
  ]).map(rowAmount),
  [0],
);
assert.deepEqual(sessionRows([session()]).map(rowAmount), [null]);

console.log("accounting-rows self-check OK");
