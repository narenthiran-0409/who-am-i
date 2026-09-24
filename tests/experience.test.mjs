import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { experienceDuration, resolveProfileExperience } from "../src/utils/experience.mjs";
import { fetchPortfolio } from "../src/utils/portfolio.mjs";
import { buildResume } from "../src/utils/content.mjs";
const read = name => JSON.parse(readFileSync(new URL(`../backend/Portfolio.Contact.Api/Content/${name}.json`, import.meta.url)));
const now = new Date("2026-09-24T00:00:00Z");
const job = (start, end) => ({ employmentDates: { start, end } });

test("experience grows from company start, independent of promotions", () => {
  const journey = read("journey");
  assert.equal(experienceDuration(journey, now), "4 years 2 months");
  assert.equal(experienceDuration(journey, new Date("2026-10-01T00:00:00Z")), "4 years 3 months");
  journey.experience[0].roleDates.start = "2026-08";
  assert.equal(experienceDuration(journey, now), "4 years 2 months");
});
test("overlapping jobs count once and gaps do not count", () => {
  assert.equal(experienceDuration({ experience: [job("2021-01", "2022-01"), job("2020-01", "2021-06"), job("2023-01", "2023-07")] }, now), "2 years 6 months");
  assert.equal(experienceDuration({ experience: [job("2026-09", null)] }, now), "Less than 1 month");
  assert.equal(experienceDuration({ experience: [job("2027-01", null), job("2026-02", "2026-01"), job("bad", null)] }, now), "Not specified");
});
test("profile summary, biography and experience fact resolve together without mutating JSON", () => {
  const profile = read("profile");
  const result = resolveProfileExperience(profile, read("journey"), now);
  assert.match(result.summary[0].text, /4 years 2 months of experience/);
  assert.match(result.biography[0], /4 years 2 months of experience/);
  assert.equal(result.facts.find(fact => fact.label === "EXPERIENCE").value, "4 years 2 months");
  assert.equal(profile.facts.find(fact => fact.label === "EXPERIENCE").value, "{{experience}}");
});
test("API data and generated resume resolve experience without displaying template tokens", async () => {
  const data = Object.fromEntries(["site", "profile", "skills", "certifications", "journey", "projects", "contact"].map(name => [name, read(name)]));
  const loaded = await fetchPortfolio({ fetcher: async () => Response.json({ schemaVersion: 1, data }) });
  assert.equal(loaded.profile.facts.find(fact => fact.label === "EXPERIENCE").value, experienceDuration(data.journey));
  assert.ok(!JSON.stringify(loaded.profile).includes("{{experience}}"));
  assert.ok(!buildResume(data.profile, data.skills, data.journey).includes("{{experience}}"));
});
