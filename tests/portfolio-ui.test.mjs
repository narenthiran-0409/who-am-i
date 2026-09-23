import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { act, createElement } from "react";

let dom, server, usePortfolio, fallback, createRoot, state;
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
function View() { state = usePortfolio(); return createElement("h1", null, state.data.profile.name); }
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

test("outage persists through retry, ignores duplicate requests, permits saved view and recovers", async () => {
  globalThis.fetch = async () => { throw Error("Offline"); };
  const root = createRoot(document.getElementById("root"));
  await act(async () => root.render(createElement(View)));
  assert.equal(state.showOutage, true);
  assert.equal(state.status, "unavailable");
  let resolve, requests = 0;
  globalThis.fetch = () => { requests++; return new Promise(done => { resolve = done; }); };
  await act(async () => { state.retry(); state.retry(); });
  assert.equal(requests, 1);
  assert.equal(state.status, "checking");
  assert.equal(state.showOutage, true);
  await act(async () => state.viewSaved());
  assert.equal(state.showOutage, false);
  assert.equal(state.viewingSaved, true);
  await act(async () => resolve(Response.json({ schemaVersion: 1, data: fallback })));
  assert.equal(state.status, "online");
  assert.equal(state.viewingSaved, false);
  assert.equal(state.showOutage, false);
  await act(async () => root.unmount());
  window.localStorage.clear();
});
test("timeout opens outage and unmount aborts an in-flight retry", async () => {
  let signal;
  globalThis.fetch = (_, options) => new Promise((resolve, reject) => {
    signal = options.signal;
    signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
  });
  const root = createRoot(document.getElementById("root"));
  await act(async () => root.render(createElement(View)));
  await act(async () => new Promise(resolve => setTimeout(resolve, 4100)));
  assert.equal(signal.aborted, true);
  assert.equal(state.showOutage, true);
  await act(async () => { state.retry(); });
  assert.equal(signal.aborted, false);
  await act(async () => root.unmount());
  assert.equal(signal.aborted, true);
});

test("outage screen exposes keyboard buttons, announces progress and focuses its title", async () => {
  window.scrollTo = () => {};
  const Screen = (await server.ssrLoadModule("/src/components/ServerTeaBreak.jsx")).default;
  let retries = 0, saved = 0;
  const root = createRoot(document.getElementById("root"));
  const props = { onRetry: () => retries++, onViewSaved: () => saved++ };
  await act(async () => root.render(createElement(Screen, { ...props, retrying: false })));
  assert.equal(document.activeElement.id, "tea-break-title");
  const buttons = document.querySelectorAll("button");
  await act(async () => buttons[0].click());
  assert.equal(retries, 1);
  await act(async () => root.render(createElement(Screen, { ...props, retrying: true })));
  assert.equal(buttons[0].disabled, true);
  assert.match(document.querySelector('[role="status"]').textContent, /checking/);
  await act(async () => { buttons[0].click(); buttons[1].click(); });
  assert.equal(retries, 1);
  assert.equal(saved, 1);
  await act(async () => root.unmount());
});
