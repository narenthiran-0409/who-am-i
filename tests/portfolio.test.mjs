import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fetchPortfolio, validPortfolio } from "../src/utils/portfolio.mjs";

const names = ["site", "profile", "certifications", "skills", "journey", "projects", "contact"];
const fixture = Object.fromEntries(names.map(name => [name, JSON.parse(readFileSync(new URL(`../backend/Portfolio.Contact.Api/Content/${name}.json`, import.meta.url)))]));
const envelope = () => ({ schemaVersion: 1, data: structuredClone(fixture) });

test("public content contract accepts current content and changed array lengths", () => {
  const payload = envelope();
  assert.equal(validPortfolio(payload), true);
  payload.data.skills = [];
  payload.data.profile.biography = ["Updated biography"];
  assert.equal(validPortfolio(payload), true);
});
test("invalid contracts and unsafe links cannot replace usable content", () => {
  for (const mutate of [p => p.schemaVersion = 2, p => p.data.profile.summary = null,
    p => p.data.site.navigation.items = [null], p => p.data.profile.socialLinks[0].href = "javascript:alert(1)",
    p => p.data.profile.portrait.src = "//untrusted.example/image.png"]) {
    const payload = envelope(); mutate(payload);
    assert.equal(validPortfolio(payload), false);
  }
});
test("content comes from the API without browser caching", async () => {
  const payload = envelope();
  payload.data.profile.aboutRole = "Updated via backend";
  const data = await fetchPortfolio({ fetcher: async (url, options) => {
    assert.equal(url, "/api/portfolio");
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    return { ok: true, json: async () => payload };
  }});
  assert.equal(data.profile.aboutRole, "Updated via backend");
});
test("network, timeout, invalid JSON and server failures never create false content", async () => {
  for (const fetcher of [async () => { throw new DOMException("Aborted", "AbortError"); },
    async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({}) }),
    async () => ({ ok: true, json: async () => { throw SyntaxError(); } })]) {
    await assert.rejects(fetchPortfolio({ fetcher }));
  }
});
