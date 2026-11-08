// Run: node --experimental-strip-types scripts/check-accounting-rows.mjs
import assert from "node:assert/strict";

import { FREE_STATUS, chargeRows, isAccountable, rowAmount, sessionRows } from "../src/lib/accounting-rows.ts";

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
  studentIds: [],
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

// Ledger rows: per-charge status and Adjusted Rate ?? Standard Rate; N/A still means $0.
const charge = (over = {}) => ({
  pageId: "c1",
  url: "https://notion.so/c1",
  createdTime: "2026-09-01T00:00:00Z",
  sessionId: "p",
  studentId: "a",
  key: "p:a",
  title: "Ana — 2026-09-10",
  standardRate: 60,
  adjustedRate: null,
  status: "Outstanding",
  note: "",
  studentRemoved: false,
  ...over,
});
const two = session({
  status: "Settled",
  students: ["Ana", "Ben"],
  studentIds: ["a", "b"],
  studentRates: [99, 99],
});
const ledger = new Map([
  [
    "p",
    [
      charge({ adjustedRate: 45, status: "Settled", url: "u-a" }),
      charge({ pageId: "c2", studentId: "b", key: "p:b", status: FREE_STATUS, url: "u-b" }),
      charge({ pageId: "c3", studentId: "gone", key: "p:gone", title: "Cy — 2026-09-10", studentRemoved: true }),
    ],
  ],
]);
const rows = chargeRows([two], ledger);
assert.deepEqual(
  rows.map((r) => [r.student, r.status, rowAmount(r), r.url]),
  [
    ["Ana", "Settled", 45, "u-a"],
    ["Ben", FREE_STATUS, 0, "u-b"],
    ["Cy", "Outstanding", 60, "https://notion.so/c1"],
  ],
);
// A student without a charge yet falls back to the live rate and session status.
assert.deepEqual(
  chargeRows([two], new Map()).map((r) => [r.student, rowAmount(r), r.url]),
  [
    ["Ana", 99, "https://notion.so/p"],
    ["Ben", 99, "https://notion.so/p"],
  ],
);
assert.equal(isAccountable(session()), true);
assert.equal(isAccountable(session({ meetingType: "Office Hours" })), false);
assert.equal(isAccountable(session({ deleted: true })), false);

console.log("accounting-rows self-check OK");
