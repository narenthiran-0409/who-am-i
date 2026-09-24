import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { act, createElement, useState } from "react";

let dom, server, Snackbar, createRoot;
const originals = new Map();
before(async () => {
  dom = new JSDOM('<button id="sender">Send</button><div id="root"></div>', { url: "http://localhost" });
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  ({ createRoot } = await import("react-dom/client"));
  server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
  Snackbar = (await server.ssrLoadModule("/src/components/contact/ContactSnackbar.jsx")).default;
});
after(async () => {
  await server?.close(); dom?.window.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});
const tick = async (t, ms) => act(async () => t.mock.timers.tick(ms));
async function mount(t, { reduced = false, kind = "success" } = {}) {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  window.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} });
  let replace, dismissals = 0;
  function Harness() {
    const [notification, setNotification] = useState({ id: 1, kind, message: "Check your fields", origin: { x: 400, y: 500 } });
    replace = () => setNotification(previous => ({ ...previous, id: previous.id + 1 }));
    return notification && createElement(Snackbar, { key: notification.id, notification,
      returnFocus: document.getElementById("sender"), onDismiss: () => { dismissals++; setNotification(null); } });
  }
  const root = createRoot(document.getElementById("root"));
  document.getElementById("sender").focus();
  await act(async () => root.render(createElement(Harness)));
  return { replace: () => act(async () => replace()), dismissals: () => dismissals,
    close: () => act(async () => root.unmount()) };
}
const panel = () => document.querySelector(".contact-snackbar");

test("success waits for entrance, counts seven seconds, then exits without stealing focus", async t => {
  const ui = await mount(t);
  try {
    assert.equal(document.activeElement.id, "sender");
    assert.equal(panel().querySelector('[role="status"]').getAttribute("aria-live"), "polite");
    assert.ok(document.querySelector(".contact-signal"));
    await tick(t, 600); assert.equal(panel().dataset.phase, "visible");
    assert.equal(document.querySelector(".contact-signal"), null);
    await tick(t, 6999); assert.equal(panel().dataset.phase, "visible");
    await tick(t, 1); assert.equal(panel().dataset.phase, "exiting");
    await tick(t, 180); assert.equal(panel(), null); assert.equal(ui.dismissals(), 1);
  } finally { await ui.close(); }
});

test("hover and focus pause together; leaving just one does not resume", async t => {
  const ui = await mount(t);
  try {
    await tick(t, 600); await tick(t, 3000);
    await act(async () => panel().dispatchEvent(new window.MouseEvent("mouseover", { bubbles: true })));
    await tick(t, 10000); assert.equal(panel().dataset.phase, "visible");
    await act(async () => document.querySelector(".contact-snackbar-close").focus());
    await act(async () => panel().dispatchEvent(new window.MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body })));
    await tick(t, 10000); assert.equal(panel().dataset.phase, "visible");
    await act(async () => document.getElementById("sender").focus());
    await tick(t, 3999); assert.equal(panel().dataset.phase, "visible");
    await tick(t, 1); assert.equal(panel().dataset.phase, "exiting");
    await tick(t, 180); assert.equal(panel(), null);
  } finally { await ui.close(); }
});

test("manual close returns focus to the sender and Escape dismisses a new notification", async t => {
  const ui = await mount(t);
  try {
    await tick(t, 600);
    await act(async () => { document.querySelector(".contact-snackbar-close").focus(); document.querySelector(".contact-snackbar-close").click(); });
    assert.equal(document.activeElement.id, "sender");
    await tick(t, 180); assert.equal(panel(), null);
  } finally { await ui.close(); }
  t.mock.timers.reset();
  const next = await mount(t);
  try {
    await act(async () => document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" })));
    await tick(t, 180); assert.equal(panel(), null);
  } finally { await next.close(); }
});

test("replacing a notification resets its timer and cancels the old dismissal", async t => {
  const ui = await mount(t);
  try {
    await tick(t, 600); await tick(t, 6500);
    await ui.replace(); await tick(t, 600); await tick(t, 6000);
    assert.equal(panel().dataset.phase, "visible"); assert.equal(ui.dismissals(), 0);
    await tick(t, 1000); await tick(t, 180);
    assert.equal(panel(), null); assert.equal(ui.dismissals(), 1);
  } finally { await ui.close(); }
});

test("reduced motion skips particle movement and keeps dismissal functional", async t => {
  const ui = await mount(t, { reduced: true });
  try {
    assert.equal(document.querySelector(".contact-signal"), null);
    assert.equal(panel().dataset.reduced, "true");
    await tick(t, 120); assert.equal(panel().dataset.phase, "visible");
    await tick(t, 7000); await tick(t, 120); assert.equal(panel(), null);
  } finally { await ui.close(); }
});

test("real errors use alert semantics and remain until dismissed", async t => {
  const ui = await mount(t, { kind: "error" });
  try {
    assert.equal(document.querySelector('[role="alert"]').textContent, "ACTION_REQUIREDCheck your fields");
    assert.equal(document.querySelector(".contact-snackbar-progress"), null);
    await tick(t, 240); await tick(t, 30000); assert.ok(panel());
  } finally { await ui.close(); }
});

test("unmount cancels notification timers and Escape listeners", async t => {
  const ui = await mount(t);
  await tick(t, 600);
  await ui.close();
  await tick(t, 20000);
  await act(async () => document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" })));
  assert.equal(ui.dismissals(), 0);
  assert.equal(panel(), null);
});
