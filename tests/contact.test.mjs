import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contactLimits, validateContact, sendContact } from "../src/utils/contact.mjs";
const data = JSON.parse(readFileSync(new URL("../src/data/contact.json", import.meta.url)));
const valid = { name: "Visitor", email: "person@example.com", subject: "Hello", message: "A project idea", website: "" };

test("contact enforces every configured maximum and rejects header control characters", () => {
  for (const [field, limit] of Object.entries(contactLimits)) {
    assert.equal(validateContact({ ...valid, [field]: "x".repeat(limit + 1) }, data.errors)[field], data.errors[field]);
  }
  for (const field of ["name", "subject", "email"]) {
    assert.ok(validateContact({ ...valid, [field]: "Value\r\nInjected" }, data.errors)[field]);
  }
  assert.deepEqual(validateContact({ ...valid, message: "Line one\nLine two" }, data.errors), {});
});
test("contact sends JSON and a stable key to API, never mailto", async () => {
  let captured;
  const result = await sendContact(valid, "same-key", { fetcher: async (url, init) => {
    captured = { url, init }; return Response.json({ status: "accepted", reference: "reference" });
  } });
  assert.equal(captured.url, "/api/contact");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.init.headers["Idempotency-Key"], "same-key");
  assert.deepEqual(JSON.parse(captured.init.body), valid);
  assert.equal(result.reference, "reference");
});
for (const [status, body, expected] of [
  [400, { errors: { Email: ["Invalid"] } }, "validation"],
  [409, {}, "pending"], [429, {}, "rateLimited"],
  [503, { code: "delivery_uncertain" }, "uncertain"],
  [503, {}, "unavailable"], [200, { status: "fake-success" }, "unavailable"],
]) test(`contact handles ${status}/${expected} without false success`, async () => {
  await assert.rejects(sendContact(valid, "key", { fetcher: async () => Response.json(body, { status }) }), error => error.code === expected);
});
test("network and timeout failures are distinguished", async () => {
  for (const [failure, code] of [[new TypeError("Failed to fetch"), "network"], [new DOMException("Aborted", "AbortError"), "timeout"]])
    await assert.rejects(sendContact(valid, "key", { fetcher: async () => { throw failure; } }), error => error.code === code);
});
