import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { act, createElement } from "react";

let dom, server, usePortfolio, fallback, createRoot;
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
  const module = await server.ssrLoadModule("/src/data/index.js");
  fallback = Object.fromEntries(["site", "profile", "skills", "certifications", "journey", "projects", "contact"].map(k => [k, module[k]]));
});
after(async () => {
  await server?.close(); dom?.window.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});
function View() { const data = usePortfolio(); return createElement("h1", null, data.profile.name); }
test("React renders immediately, applies API data and metadata, then survives offline reload", async () => {
  let resolve;
  globalThis.fetch = () => new Promise(done => { resolve = done; });
  let root = createRoot(document.getElementById("root"));
  await act(async () => root.render(createElement(View)));
  assert.equal(document.querySelector("h1").textContent, fallback.profile.name);
  const data = JSON.parse(JSON.stringify(fallback)); data.profile.name = "Live API content"; data.site.meta.title = "API title";
  await act(async () => resolve(Response.json({ schemaVersion: 1, data })));
  assert.equal(document.querySelector("h1").textContent, "Live API content");
  assert.equal(document.title, "API title");
  await act(async () => root.unmount());
  globalThis.fetch = async () => { throw Error("Offline"); };
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(createElement(View)));
  assert.equal(document.querySelector("h1").textContent, "Live API content");
  await act(async () => root.unmount());
  window.localStorage.clear();
});
