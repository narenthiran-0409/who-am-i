import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { buildNavigation } from "../src/utils/content.mjs";

const read = name => JSON.parse(readFileSync(new URL(`../backend/Portfolio.Contact.Api/Content/${name}.json`, import.meta.url), "utf8"));
const site = read("site");
const projects = read("projects");
let server, Projects;
before(async () => {
  server = await createServer({ optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true, hmr: false, watch: null }, appType: "custom" });
  Projects = (await server.ssrLoadModule("/src/components/Projects.jsx")).default;
});
after(async () => { await server?.close(); });
const render = items => renderToStaticMarkup(createElement(Projects, {
  data: { enabled: true, items }, heading: site.sections.projects, labels: site.labels,
}));

test("configured Projects navigation keeps its label and position without duplication or mutation", () => {
  const navigation = { items: [{ target: "hero", label: "Home" }, { target: "projects", label: "My work" }] };
  const original = structuredClone(navigation);
  const result = buildNavigation(navigation, { ...projects, enabled: true }, "Projects");
  assert.deepEqual(result, original);
  assert.deepEqual(navigation, original);
  assert.notEqual(result.items, navigation.items);
});
test("Projects navigation is added once only when there is an enabled project", () => {
  const navigation = { items: [{ target: "hero", label: "Home" }] };
  const enabled = { enabled: true, items: [{ id: "example" }] };
  const result = buildNavigation(navigation, enabled, "Projects");
  assert.equal(result.items.filter(item => item.target === "projects").length, 1);
  assert.deepEqual(buildNavigation(result, enabled, "Projects"), result);
  for (const data of [{ enabled: false, items: enabled.items }, { enabled: true, items: [] }]) {
    assert.deepEqual(buildNavigation(navigation, data, "Projects"), navigation);
  }
});
test("current portfolio project data renders all cards and a unique Projects navigation link", () => {
  const html = render(projects.items);
  assert.equal((html.match(/class="project-card panel"/g) || []).length, projects.items.length);
  for (const item of projects.items) {
    for (const tag of item.technologies ?? item.tags ?? []) assert.ok(html.includes(`<span>${tag}</span>`));
  }
  assert.equal(buildNavigation(site.navigation, projects, site.labels.projectsNavigation).items.filter(item => item.target === "projects").length, projects.enabled && projects.items.length ? 1 : 0);
});
test("disabled Projects removes its configured navigation link", () => {
  assert.equal(buildNavigation({ items: [{ target: "projects", label: "Projects" }] }, { enabled: false, items: [] }, "Projects").items.length, 0);
});
test("project cards accept both field conventions and omitted optional tags", () => {
  const base = { id: "sample", title: "Sample", description: "Example" };
  for (const extra of [
    { technologies: ["React"], url: "https://example.com/demo" },
    { tags: ["React"], projectUrl: "https://example.com/demo" },
  ]) {
    const html = render([{ ...base, ...extra }]);
    assert.ok(html.includes("<span>React</span>"));
    assert.ok(html.includes('href="https://example.com/demo"'));
  }
  assert.doesNotThrow(() => render([base]));
  assert.equal(render([]), "");
});
