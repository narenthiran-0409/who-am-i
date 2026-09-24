import { test } from "node:test";
import assert from "node:assert/strict";
import { monthIndex, roleDuration, rolePeriod } from "../src/utils/timeline.mjs";

test("durations count elapsed calendar months, including year boundaries", () => {
  assert.equal(roleDuration({ start: "2022-08", end: "2023-02" }), "6 months");
  assert.equal(roleDuration({ start: "2022-07", end: "2023-02" }), "7 months");
  assert.equal(roleDuration({ start: "2023-02", end: "2026-01" }), "2 years 11 months");
  assert.equal(roleDuration({ start: "2025-01", end: "2026-01" }), "1 year");
  assert.equal(roleDuration({ start: "2026-01", end: "2026-02" }), "1 month");
  assert.equal(roleDuration({ start: "2026-01", end: "2026-01" }), "Less than 1 month");
});
test("ongoing durations use the current month and reject missing or reversed dates", () => {
  assert.equal(roleDuration({ start: "2026-02", end: null }, new Date("2026-09-24T00:00:00Z")), "7 months");
  assert.equal(roleDuration({ start: "2026-01", end: null }, new Date("2026-09-24T00:00:00Z")), "8 months");
  for (const dates of [undefined, { start: "2026-13", end: null }, { start: "2026-01" }, { start: "2026-02", end: "2026-01" }]) assert.equal(roleDuration(dates), null);
  assert.equal(monthIndex("2026-1"), null);
});
test("structured role dates display a specific start while legacy periods still work", () => {
  assert.equal(rolePeriod({ roleDates: { start: "2026-01", end: null }, period: "2022 - Present" }), "Jan 2026 - Present");
  assert.equal(rolePeriod({ roleDates: { start: "2022-08", end: "2023-02" } }), "Aug 2022 - Feb 2023");
  assert.equal(rolePeriod({ period: "2022 - Present" }), "2022 - Present");
});
