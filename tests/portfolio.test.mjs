import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cachedPortfolio, fetchPortfolio, validPortfolio } from "../src/utils/portfolio.mjs";

const names = ["site", "profile", "certifications", "skills", "journey", "projects", "contact"];
const fallback = Object.fromEntries(names.map(name => [name, JSON.parse(readFileSync(new URL(`../backend/Portfolio.Contact.Api/Content/${name}.json`, import.meta.url)))]));
const envelope = () => ({ schemaVersion: 1, data: structuredClone(fallback) });
const memory = () => { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; };

test("public content contract accepts current content and changed array lengths", () => {
  const payload = envelope();
  assert.equal(validPortfolio(payload, fallback), true);
  payload.data.skills = [];
  payload.data.profile.biography = ["Updated biography"];
  assert.equal(validPortfolio(payload, fallback), true);
});
test("invalid contracts and unsafe links cannot replace usable content", () => {
  for (const mutate of [p => p.schemaVersion = 2, p => p.data.profile.summary = null,
    p => p.data.site.navigation.items = [null], p => p.data.profile.socialLinks[0].href = "javascript:alert(1)",
    p => p.data.profile.portrait.src = "//untrusted.example/image.png"]) {
    const payload = envelope(); mutate(payload);
    assert.equal(validPortfolio(payload, fallback), false);
  }
});
test("API content updates and is available as last-known fallback", async () => {
  const storage = memory(), payload = envelope();
  payload.data.profile.aboutRole = "Updated via backend";
  const data = await fetchPortfolio(fallback, { storage, fetcher: async (url, options) => {
    assert.equal(url, "/api/portfolio"); assert.equal(options.credentials, "omit");
    return { ok: true, json: async () => payload };
  }});
  assert.equal(data.profile.aboutRole, "Updated via backend");
  assert.deepEqual(cachedPortfolio(fallback, storage), data);
});
test("storage denial and corrupted or expired cache retain bundled data", () => {
  assert.equal(cachedPortfolio(fallback, { getItem() { throw Error("denied"); } }), fallback);
  assert.equal(cachedPortfolio(fallback, { getItem: () => "{bad" }), fallback);
  assert.equal(cachedPortfolio(fallback, { getItem: () => JSON.stringify({ savedAt: 0, payload: envelope() }) }), fallback);
});
test("network, timeout, invalid JSON and server failures never create false content", async () => {
  for (const fetcher of [async () => { throw new DOMException("Aborted", "AbortError"); },
    async () => ({ ok: false }), async () => ({ ok: true, json: async () => ({}) }),
    async () => ({ ok: true, json: async () => { throw SyntaxError(); } })]) {
    await assert.rejects(fetchPortfolio(fallback, { fetcher }));
  }
});
