import { readFileSync, writeFileSync } from "node:fs";
import { buildResume } from "../src/utils/content.mjs";
const read = (name) =>
  JSON.parse(
    readFileSync(new URL(`../backend/Portfolio.Contact.Api/Content/${name}.json`, import.meta.url), "utf8"),
  );
writeFileSync(
  new URL("../public/assets/resume.txt", import.meta.url),
  buildResume(read("profile"), read("skills"), read("journey")),
);
console.log("Generated résumé from portfolio JSON.");
