import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildResume,
  buildContactDraft,
  validateContact,
} from "../src/utils/content.mjs";
const read = (name) =>
  JSON.parse(
    readFileSync(
      new URL("../src/data/" + name + ".json", import.meta.url),
      "utf8",
    ),
  );
const profile = read("profile"),
  skills = read("skills"),
  journey = read("journey"),
  contact = read("contact");
test("whitespace-only fields fail validation and malformed email is rejected", () => {
  assert.deepEqual(
    Object.keys(
      validateContact(
        { name: "  ", email: "broken", message: " \n " },
        contact.errors,
      ),
    ),
    ["name", "email", "message"],
  );
});
test("valid contact input accepts international names and trims email", () => {
  assert.deepEqual(
    validateContact(
      {
        name: "நரேந்திரன்",
        email: " person+test@example.com ",
        message: "Hello",
      },
      contact.errors,
    ),
    {},
  );
});
test("contact draft encodes user-controlled query delimiters and Unicode safely", () => {
  const values = {
    name: "Test & Team",
    email: "test@example.com",
    message: "தமிழ் &subject=injected? #hello",
  };
  const result = buildContactDraft(values, contact);
  const url = new URL(result.href);
  assert.equal(url.searchParams.get("subject"), contact.subject);
  assert.equal(url.searchParams.get("body"), result.body);
  assert.equal([...url.searchParams.keys()].length, 2);
  assert.ok(result.body.includes(values.message));
});
test("resume uses changed JSON content and marks the supplied sample", () => {
  const sampleNotice = "SAMPLE RESUME — Replace before sharing.";
  const resume = buildResume(
    { ...profile, name: "Updated Person", resume: { ...profile.resume, sampleNotice } },
    skills,
    journey,
  );
  assert.ok(resume.includes("Updated Person"));
  assert.ok(resume.includes(sampleNotice));
  for (const item of skills) assert.ok(resume.includes(item.name));
  for (const item of journey.education) assert.ok(resume.includes(item.title));
});
test("optional empty career arrays produce a usable resume", () => {
  assert.doesNotThrow(() =>
    buildResume(profile, [], { experience: [], education: [] }),
  );
});
test("resume includes organization role history without inventing missing dates", () => {
  const resume = buildResume(profile, [], {
    education: [],
    experience: [{
      title: "Developer", organization: "Example Org", period: "2024–present",
      history: [{ id: "trainee", title: "Technical Trainee", period: null, description: "Learned .NET skills." }],
    }],
  });
  assert.ok(resume.includes("Developer | Example Org | 2024–present"));
  assert.ok(resume.includes("Technical Trainee | Example Org\nLearned .NET skills."));
});
