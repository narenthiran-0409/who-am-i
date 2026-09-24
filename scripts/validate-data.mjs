import { paths } from "../src/utils/icons.mjs";
import { contactLimits } from "../src/utils/contact.mjs";
import { buildNavigation } from "../src/utils/content.mjs";
import { monthIndex } from "../src/utils/timeline.mjs";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) =>
  JSON.parse(readFileSync(resolve(root, "backend/Portfolio.Contact.Api/Content", name + ".json"), "utf8"));
const names = [
  "site",
  "profile",
  "certifications",
  "skills",
  "journey",
  "projects",
  "contact",
];
const data = Object.fromEntries(names.map((name) => [name, read(name)]));
const fail = (message) => {
  throw new Error("Portfolio data: " + message);
};
const required = (v, path) => {
  if (typeof v !== "string" || !v.trim())
    fail(path + " must be a nonempty string");
};
for (const [name, records] of Object.entries({
  certifications: data.certifications,
  skills: data.skills,
  education: data.journey.education,
  experience: data.journey.experience,
  projects: data.projects.items,
})) {
  if (!Array.isArray(records)) fail(name + " must be an array");
  const ids = new Set();
  for (const item of records) {
    required(item.id, name + ".id");
    if (ids.has(item.id)) fail(name + " contains duplicate id " + item.id);
    ids.add(item.id);
    required(item.name || item.title, name + ".title/name");
  }
}
required(data.profile.name, "profile.name");
for (const key of ["expand", "collapse", "currentEducation", "pastEducation", "currentExperience", "pastExperience"])
  required(data.journey.timelineLabels?.[key], "journey.timelineLabels." + key);
for (const item of data.journey.experience) {
  if (item.employmentDates != null) {
    const { start, end } = item.employmentDates;
    if (monthIndex(start) === null || (end !== null && (monthIndex(end) === null || monthIndex(end) < monthIndex(start))))
      fail("journey." + item.id + ".employmentDates requires YYYY-MM dates in chronological order, or null for an ongoing end");
  }
  for (const role of [item, ...(Array.isArray(item.history) ? item.history : [])]) {
    if (role.roleDates == null) continue;
    const { start, end } = role.roleDates;
    if (monthIndex(start) === null || (end !== null && (monthIndex(end) === null || monthIndex(end) < monthIndex(start))))
      fail("journey." + role.id + ".roleDates requires YYYY-MM dates in chronological order, or null for an ongoing end");
  }
  if (item.history == null) continue;
  if (!Array.isArray(item.history)) fail("journey." + item.id + ".history must be an array");
  const roleIds = new Set([item.id]);
  for (const role of item.history) {
    required(role.id, "journey." + item.id + ".history.id");
    required(role.title, "journey." + item.id + ".history.title");
    if (roleIds.has(role.id)) fail("duplicate role id: " + role.id);
    roleIds.add(role.id);
    if (role.period != null) required(role.period, "journey." + item.id + ".history.period");
    if (role.highlights != null) {
      if (!Array.isArray(role.highlights)) fail("role highlights must be an array");
      for (const text of role.highlights) required(text, "role highlight");
    }
  }
}
for (const item of [...data.journey.education, ...data.journey.experience]) {
  if (item.logo == null) continue;
  if (typeof item.logo !== "object" || Array.isArray(item.logo))
    fail("journey." + item.id + ".logo must be an object with src and alt, or null");
  required(item.logo.src, "journey." + item.id + ".logo.src");
  required(item.logo.alt, "journey." + item.id + ".logo.alt");
}
required(data.profile.intro, "profile.intro");
required(data.site.meta.title, "site.meta.title");
const sections = new Set([
  "hero",
  "about",
  "certifications",
  "skills",
  "experience-education",
  "contact",
  ...(data.projects.enabled && data.projects.items.length ? ["projects"] : []),
]);
const navigationTargets = new Set();
for (const item of buildNavigation(data.site.navigation, data.projects, data.site.labels.projectsNavigation).items) {
  if (navigationTargets.has(item.target))
    fail("duplicate navigation target: " + item.target);
  navigationTargets.add(item.target);
  if (!sections.has(item.target))
    fail("navigation target not found: " + item.target);
}
for (const item of data.projects.items) {
  for (const key of ["technologies", "tags"]) {
    if (item[key] == null) continue;
    if (!Array.isArray(item[key])) fail("projects." + item.id + "." + key + " must be an array");
    for (const tag of item[key]) required(tag, "projects." + item.id + "." + key);
    if (new Set(item[key]).size !== item[key].length)
      fail("projects." + item.id + "." + key + " contains duplicate tags");
  }
}
const knownIcons = new Set(Object.keys(paths));
function inspect(value, path = "data") {
  if (Array.isArray(value)) {
    value.forEach((v, i) => inspect(v, path + "[" + i + "]"));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (key === "icon" && item && !knownIcons.has(item))
      fail(path + ".icon is unsupported: " + item);
    if (
      [
        "href",
        "src",
        "url",
        "credentialUrl",
        "sourceUrl",
        "projectUrl",
        "generatedUrl",
        "modelUrl",
        "fallbackImage",
      ].includes(key) &&
      item
    ) {
      if (
        typeof item !== "string" ||
        !/^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/.test(item)
      )
        fail(path + "." + key + " has an unsupported URL");
      if (item.startsWith("#") && !sections.has(item.slice(1)))
        fail(path + "." + key + " references a missing section");
      if (
        item.startsWith("/") &&
        !existsSync(resolve(root, "public", item.slice(1)))
      )
        fail("missing local asset: " + item);
    }
    inspect(item, path + "." + key);
  }
}
inspect(data);
if (data.profile.heroVideo) {
  for (const key of ["src", "fallbackImage", "accessibleLabel", "alt"])
    required(data.profile.heroVideo[key], "profile.heroVideo." + key);
  for (const key of ["width", "height"])
    if (!Number.isInteger(data.profile.heroVideo[key]) || data.profile.heroVideo[key] <= 0)
      fail("profile.heroVideo." + key + " must be a positive integer");
}
for (const f of data.contact.fields) {
  required(f.label, "contact.fields.label");
  if (!Object.hasOwn(contactLimits, f.name))
    fail("unknown contact field " + f.name);
  if (f.maxLength !== contactLimits[f.name]) fail("contact field limit mismatch: " + f.name);
  required(data.contact.errors[f.name], "contact.errors." + f.name);
}
for (const f of Object.keys(contactLimits))
  if (data.contact.fields.filter((v) => v.name === f).length !== 1)
    fail("contact requires exactly one " + f + " field");
for (const state of ["idle", "validating", "sending", "success", "error"])
  required(data.contact.states[state], "contact.states." + state);
for (const code of ["success", "validation", "network", "timeout", "uncertain", "pending", "rateLimited", "unavailable"])
  required(data.contact.feedback[code], "contact.feedback." + code);
console.log(
  "Validated 7 JSON data files, IDs, navigation, icons, URLs, and local assets.",
);
