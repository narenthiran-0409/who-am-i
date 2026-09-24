import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { act, createElement } from "react";

let dom, server, usePortfolio, fixture, createRoot;
const originals = new Map();
before(async () => {
  dom = new JSDOM('<meta name="description"><div id="root"></div>', { url: "http://localhost" });
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  originals.set("fetch", Object.getOwnPropertyDescriptor(globalThis, "fetch"));
  ({ createRoot } = await import("react-dom/client"));
  server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
  usePortfolio = (await server.ssrLoadModule("/src/hooks/usePortfolio.js")).default;
  fixture = Object.fromEntries(["site", "profile", "skills", "certifications", "journey", "projects", "contact"].map(k => [k, JSON.parse(readFileSync(new URL(`../backend/Portfolio.Contact.Api/Content/${k}.json`, import.meta.url), "utf8"))]));
});
after(async () => {
  await server?.close(); dom?.window.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});
function View() { const { data, error, retry } = usePortfolio(); return createElement("div", null, createElement("h1", null, data?.profile.name || error || "Loading"), error && createElement("button", { onClick: retry }, "Try again")); }
test("React waits for API data, shows offline errors despite cached content, and retries", async () => {
  let resolve;
  globalThis.fetch = () => new Promise(done => { resolve = done; });
  let root = createRoot(document.getElementById("root"));
  await act(async () => root.render(createElement(View)));
  assert.equal(document.querySelector("h1").textContent, "Loading");
  const data = JSON.parse(JSON.stringify(fixture)); data.profile.name = "Live API content"; data.site.meta.title = "API title";
  await act(async () => resolve(Response.json({ schemaVersion: 1, data })));
  assert.equal(document.querySelector("h1").textContent, "Live API content");
  assert.equal(document.title, "API title");
  await act(async () => root.unmount());
  window.localStorage.setItem("portfolio-content-v1", JSON.stringify({ savedAt: Date.now(), payload: { schemaVersion: 1, data } }));
  globalThis.fetch = async () => { throw Error("Offline"); };
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(createElement(View)));
  assert.match(document.querySelector("h1").textContent, /Unable to load/);
  globalThis.fetch = async () => Response.json({ schemaVersion: 1, data });
  await act(async () => document.querySelector("button").click());
  assert.equal(document.querySelector("h1").textContent, "Live API content");
  await act(async () => root.unmount());
  window.localStorage.clear();
});

test("outage screen offers retry without saved portfolio access", async () => {
  const Screen = (await server.ssrLoadModule("/src/components/ServerTeaBreak.jsx")).default;
  const scrollTo = window.scrollTo;
  window.scrollTo = () => {};
  const root = createRoot(document.getElementById("root"));
  let retries = 0;
  try {
    await act(async () => root.render(createElement(Screen, { retrying: false, onRetry: () => retries++ })));
    assert.match(document.querySelector("h1").textContent, /tea break/);
    assert.equal(document.querySelectorAll("button").length, 1);
    await act(async () => document.querySelector("button").click());
    assert.equal(retries, 1);
  } finally {
    await act(async () => root.unmount());
    window.scrollTo = scrollTo;
  }
});
