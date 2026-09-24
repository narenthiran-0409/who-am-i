import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { act, createElement } from "react";

const data = JSON.parse(readFileSync(new URL("../backend/Portfolio.Contact.Api/Content/contact.json", import.meta.url)));
let server, Contact, createRoot, dom;
const originals = new Map();
before(async () => {
  dom = new JSDOM('<div id="root"></div>', { url: "http://localhost" });
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, FormData: dom.window.FormData, IS_REACT_ACT_ENVIRONMENT: true })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  originals.set("fetch", Object.getOwnPropertyDescriptor(globalThis, "fetch"));
  ({ createRoot } = await import("react-dom/client"));
  server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
  Contact = (await server.ssrLoadModule("/src/components/Contact.jsx")).default;
});
after(async () => {
  await server?.close(); dom?.window.close();
  for (const [key, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

async function mount() {
  const root = createRoot(document.getElementById("root"));
  await act(async () => root.render(createElement(Contact, { data })));
  const form = document.querySelector("form");
  return { form, root, submit: () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })), close: () => act(async () => root.unmount()) };
}
function fill(form) {
  for (const [field, value] of Object.entries({ name: "Visitor", email: "visitor@example.com", subject: "Project", message: "A portfolio inquiry" })) form.elements.namedItem(field).value = value;
}
test("invalid form focuses the first error without calling API", async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; };
  const ui = await mount();
  try {
    await act(async () => ui.submit());
    assert.equal(calls, 0);
    assert.equal(document.activeElement.id, "contact-name");
    assert.equal(document.querySelectorAll('[aria-invalid="true"]').length, 4);
    assert.match(document.querySelector('[role="alert"]').textContent, /ACTION_REQUIRED/);
  } finally { await ui.close(); }
});
test("sending locks duplicate clicks, then success clears fields and announces result", async () => {
  let calls = 0, resolve;
  globalThis.fetch = async () => { calls++; return new Promise(done => { resolve = done; }); };
  const ui = await mount();
  try {
    fill(ui.form);
    await act(async () => { ui.submit(); ui.submit(); });
    assert.equal(calls, 1);
    assert.equal(document.querySelector('button[type="submit"]').disabled, true);
    assert.equal(ui.form.getAttribute("aria-busy"), "true");
    assert.equal(ui.form.elements.namedItem("message").readOnly, true);
    assert.match(document.querySelector('button[type="submit"]').textContent, /TRANSMITTING\.\.\./);
    assert.equal(document.querySelector('[role="status"]'), null);
    await act(async () => resolve(Response.json({ status: "accepted", reference: "test" })));
    assert.equal(ui.form.elements.namedItem("message").value, "");
    assert.equal(document.querySelector('button[type="submit"]').disabled, false);
    for (const field of ["name", "email", "subject", "message"]) assert.equal(ui.form.elements.namedItem(field).value, "");
    assert.match(document.querySelector('[role="status"]').textContent, /MESSAGE_RECEIVED/);
    assert.equal(document.querySelector('.contact-status'), null);
    assert.equal(document.querySelector('.contact-snackbar-message').textContent, "Successfully landed in my inbox — no 404s here 😎");
    ui.form.elements.namedItem("name").value = "Another visitor";
    await act(async () => ui.form.elements.namedItem("name").dispatchEvent(new dom.window.Event("input", { bubbles: true })));
    assert.ok(document.querySelector('[role="status"]'));
  } finally { await ui.close(); }
});
test("network failure preserves input and retry reuses request key", async () => {
  const keys = [];
  globalThis.fetch = async (_, init) => { keys.push(init.headers["Idempotency-Key"]); throw new TypeError("Offline"); };
  const ui = await mount();
  try {
    fill(ui.form); await act(async () => ui.submit());
    assert.equal(ui.form.elements.namedItem("message").value, "A portfolio inquiry");
    assert.match(document.querySelector('[role="alert"]').textContent, /connection was interrupted/);
    assert.equal(document.querySelector('[role="status"]'), null);
    await act(async () => document.querySelector('.contact-snackbar-retry').click());
    assert.equal(keys.length, 2); assert.equal(keys[0], keys[1]);
  } finally { await ui.close(); }
});
test("backend field errors are mapped without rendering server HTML", async () => {
  globalThis.fetch = async () => Response.json({ errors: { Email: ["<script>bad</script>"] } }, { status: 400 });
  const ui = await mount();
  try {
    fill(ui.form); await act(async () => ui.submit());
    assert.equal(ui.form.elements.namedItem("email").getAttribute("aria-invalid"), "true");
    assert.equal(document.activeElement.id, "contact-email");
    assert.equal(document.querySelector("script"), null);
    assert.equal(document.getElementById("error-email").textContent, data.errors.email);
  } finally { await ui.close(); }
});

test("already accepted 409 clears the form and shows the same success snackbar", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ status: "accepted", reference: "existing" }, { status: 409 }); };
  const ui = await mount();
  try {
    fill(ui.form); await act(async () => ui.submit());
    assert.equal(calls, 1);
    assert.equal(ui.form.elements.namedItem("message").value, "");
    assert.match(document.querySelector('[role="status"]').textContent, /MESSAGE_RECEIVED/);
    assert.equal(document.querySelector('[role="alert"]'), null);
  } finally { await ui.close(); }
});

test("pending 409 preserves the form and does not announce success", async () => {
  globalThis.fetch = async () => Response.json({ code: "pending" }, { status: 409 });
  const ui = await mount();
  try {
    fill(ui.form); await act(async () => ui.submit());
    assert.equal(ui.form.elements.namedItem("message").value, "A portfolio inquiry");
    assert.equal(document.querySelector('[role="status"]'), null);
    assert.match(document.querySelector('[role="alert"]').textContent, /still being processed/);
  } finally { await ui.close(); }
});
