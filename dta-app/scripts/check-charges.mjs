// Run: node --experimental-strip-types scripts/check-charges.mjs
import assert from "node:assert/strict";

import {
  CHARGE_PROPS,
  backfillSeed,
  chargeFromPage,
  chargeKey,
  chargeRate,
  desiredFields,
  diffFields,
  managedProperties,
  mergeUserFields,
  pickSurvivor,
  removalAction,
  flaggedFields,
  sessionHasPassed,
  targetStandardRate,
  targetStatus,
} from "../src/lib/charges.ts";

const TZ = "America/Los_Angeles";
const charge = (over = {}) => ({
  pageId: "c1",
  url: "u",
  createdTime: "2026-09-01T00:00:00Z",
  sessionId: "s",
  studentId: "a",
  key: "s:a",
  title: "Ana — 2026-09-10",
  standardRate: 60,
  adjustedRate: null,
  status: "Outstanding",
  note: "",
  studentRemoved: false,
  date: "2026-09-10",
  sessionStatusApplied: "",
  ...over,
});

// Key is dashless and lowercase.
assert.equal(chargeKey("AB-CD", "e-F"), "abcd:ef");

// Amount resolution: Adjusted overrides Standard; neither -> blank.
assert.equal(chargeRate(45, 60), 45);
assert.equal(chargeRate(0, 60), 0);
assert.equal(chargeRate(null, 60), 60);
assert.equal(chargeRate(null, null), null);

// Freezing: blank snapshots (even for past); future follows; past is frozen.
assert.equal(targetStandardRate(null, 70, true), 70);
assert.equal(targetStandardRate(null, 70, false), 70);
assert.equal(targetStandardRate(60, 70, false), 70);
assert.equal(targetStandardRate(60, 70, true), 60);
assert.equal(targetStandardRate(60, null, false), 60);
assert.equal(targetStandardRate(null, null, true), null);

// "Passed" is by Pacific calendar day.
const now = new Date("2026-09-10T20:00:00Z"); // 1pm Pacific, Sep 10
assert.equal(sessionHasPassed("2026-09-09", now, TZ), true);
assert.equal(sessionHasPassed("2026-09-10", now, TZ), false);
assert.equal(sessionHasPassed("2026-09-10T03:00:00Z", now, TZ), true); // Sep 9 8pm Pacific
assert.equal(sessionHasPassed("2026-09-11T01:00:00Z", now, TZ), false); // Sep 10 6pm Pacific

// No-op diff: an up-to-date charge yields no patch, so no write (echoes terminate).
const input = {
  title: "Ana — 2026-09-10",
  currentRate: 60,
  passed: false,
  ymd: "2026-09-10",
  sessionStatus: null,
};
assert.deepEqual(diffFields(charge(), desiredFields(charge(), input)), {});
// The app never touches Adjusted Rate/Note, nor a Status the session hasn't changed.
const edited = charge({ adjustedRate: 10, status: "Settled", note: "paid cash" });
assert.deepEqual(diffFields(edited, desiredFields(edited, input)), {});
// Future sessions follow a rate change; past ones keep the snapshot.
assert.deepEqual(diffFields(charge(), desiredFields(charge(), { ...input, currentRate: 80 })), {
  standardRate: 80,
});
assert.deepEqual(
  diffFields(charge(), desiredFields(charge(), { ...input, currentRate: 80, passed: true })),
  {},
);
// A cleared Standard Rate re-snapshots even for a past session.
assert.deepEqual(
  diffFields(
    charge({ standardRate: null }),
    desiredFields(charge({ standardRate: null }), { ...input, currentRate: 80, passed: true }),
  ),
  { standardRate: 80 },
);
// A returning student is un-flagged.
assert.deepEqual(
  diffFields(charge({ studentRemoved: true }), desiredFields(charge(), input)),
  { studentRemoved: false },
);
// Session Status: a change is copied onto every charge; an individual charge edit sticks
// until the session's Status changes again; clearing the session Status keeps the charge's.
assert.deepEqual(targetStatus(null, "Settled"), { status: "Settled", sessionStatusApplied: "Settled" });
assert.deepEqual(targetStatus(null, null), { status: "Outstanding", sessionStatusApplied: "" });
const synced = charge({ status: "Outstanding", sessionStatusApplied: "Outstanding" });
assert.deepEqual(
  diffFields(synced, desiredFields(synced, { ...input, sessionStatus: "Settled" })),
  { status: "Settled", sessionStatusApplied: "Settled" },
);
const override = charge({ status: "Settled", sessionStatusApplied: "Outstanding" });
assert.deepEqual(diffFields(override, desiredFields(override, { ...input, sessionStatus: "Outstanding" })), {});
assert.deepEqual(
  diffFields(override, desiredFields(override, { ...input, sessionStatus: "N/A" })),
  { status: "N/A", sessionStatusApplied: "N/A" },
);
assert.deepEqual(
  diffFields(override, desiredFields(override, { ...input, sessionStatus: null })),
  { sessionStatusApplied: "" },
);
// A backfilled charge (status copied, nothing recorded as applied) only records the status.
const backfilled = charge({ status: "Settled", sessionStatusApplied: "" });
assert.deepEqual(
  diffFields(backfilled, desiredFields(backfilled, { ...input, sessionStatus: "Settled" })),
  { sessionStatusApplied: "Settled" },
);
// Date fills in for charges created before it existed; flagging changes only the flag.
assert.deepEqual(diffFields(charge({ date: "" }), desiredFields(charge({ date: "" }), input)), {
  date: "2026-09-10",
});
assert.deepEqual(diffFields(edited, flaggedFields(edited)), { studentRemoved: true });

// Patch properties contain only managed fields.
assert.deepEqual(Object.keys(managedProperties({ standardRate: 80 })), [CHARGE_PROPS.standardRate]);
assert.ok(!(CHARGE_PROPS.adjustedRate in managedProperties({ title: "t", standardRate: 1, studentRemoved: true })));

// Removal: untouched -> trash; any user edit -> keep and flag.
assert.equal(removalAction(charge()), "trash");
assert.equal(removalAction(charge({ status: null })), "trash");
assert.equal(removalAction(charge({ adjustedRate: 0 })), "flag");
assert.equal(removalAction(charge({ note: "x" })), "flag");
assert.equal(removalAction(charge({ status: "Settled" })), "flag");
assert.equal(removalAction(charge({ status: "N/A" })), "flag");

// Dedupe: keep the edited one, else the oldest; merging fills blanks from discards.
const plain = charge({ pageId: "old", createdTime: "2026-01-01T00:00:00Z" });
const newer = charge({ pageId: "new", createdTime: "2026-02-01T00:00:00Z" });
const edit = charge({ pageId: "edit", createdTime: "2026-03-01T00:00:00Z", adjustedRate: 30 });
assert.equal(pickSurvivor([newer, plain]).keep.pageId, "old");
const picked = pickSurvivor([plain, newer, edit]);
assert.equal(picked.keep.pageId, "edit");
assert.deepEqual(picked.discard.map((c) => c.pageId).sort(), ["new", "old"]);
assert.deepEqual(
  mergeUserFields(plain, [charge({ adjustedRate: 5, note: "n", status: "Settled" })]),
  { adjustedRate: 5, note: "n", status: "Settled" },
);
assert.deepEqual(mergeUserFields(edit, [charge({ adjustedRate: 5 })]), {});

// Page parsing: key derives from the relations, blank rates stay null.
const page = {
  id: "c1",
  url: "u",
  created_time: "t",
  properties: {
    [CHARGE_PROPS.title]: { type: "title", title: [{ plain_text: "Ana — 2026-09-10" }] },
    [CHARGE_PROPS.session]: { type: "relation", relation: [{ id: "S-1" }] },
    [CHARGE_PROPS.student]: { type: "relation", relation: [{ id: "A-1" }] },
    [CHARGE_PROPS.key]: { type: "rich_text", rich_text: [{ plain_text: "hand edited" }] },
    [CHARGE_PROPS.standardRate]: { type: "number", number: null },
    [CHARGE_PROPS.adjustedRate]: { type: "number", number: 12 },
    [CHARGE_PROPS.status]: { type: "select", select: { name: "Settled" } },
    [CHARGE_PROPS.note]: { type: "rich_text", rich_text: [] },
    [CHARGE_PROPS.studentRemoved]: { type: "checkbox", checkbox: true },
  },
};
assert.deepEqual(chargeFromPage(page), {
  pageId: "c1",
  url: "u",
  createdTime: "t",
  sessionId: "S-1",
  studentId: "A-1",
  key: "s1:a1",
  title: "Ana — 2026-09-10",
  standardRate: null,
  adjustedRate: 12,
  status: "Settled",
  note: "",
  studentRemoved: true,
  date: "",
  sessionStatusApplied: "",
});
assert.equal(chargeFromPage({ ...page, properties: {} }), null);

// Backfill seed: sheet amount preferred; N/A sessions ignore their masked $0.
assert.deepEqual(backfillSeed("Settled", 50, 60), { seed: 50, mismatch: true });
assert.deepEqual(backfillSeed("Settled", 60, 60), { seed: 60, mismatch: false });
assert.deepEqual(backfillSeed("Settled", null, 60), { seed: 60, mismatch: false });
assert.deepEqual(backfillSeed("N/A", 0, 60), { seed: 60, mismatch: false });
assert.deepEqual(backfillSeed(null, 40, null), { seed: 40, mismatch: false });

console.log("charges self-check OK");
