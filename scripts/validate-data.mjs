import { paths } from "../src/utils/icons.mjs";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) =>
  JSON.parse(readFileSync(resolve(root, "src/data", name + ".json"), "utf8"));
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
required(data.profile.intro, "profile.intro");
required(data.site.meta.title, "site.meta.title");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact.recipient))
  fail("contact.recipient must be an email address");
const sections = new Set([
  "hero",
  "about",
  "certifications",
  "skills",
  "experience-education",
  "contact",
  ...(data.projects.enabled && data.projects.items.length ? ["projects"] : []),
]);
for (const item of data.site.navigation.items)
  if (!sections.has(item.target))
    fail("navigation target not found: " + item.target);
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
        "generatedUrl",
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
for (const f of data.contact.fields) {
  required(f.label, "contact.fields.label");
  if (!["name", "email", "message"].includes(f.name))
    fail("unknown contact field " + f.name);
}
for (const f of ["name", "email", "message"])
  if (data.contact.fields.filter((v) => v.name === f).length !== 1)
    fail("contact requires exactly one " + f + " field");
console.log(
  "Validated 7 JSON data files, IDs, navigation, icons, URLs, and local assets.",
);
