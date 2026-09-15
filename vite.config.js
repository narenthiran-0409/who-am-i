import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
const escapeHtml = (value) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export default defineConfig({
  plugins: [
    react(),
    {
      name: "portfolio-metadata",
      transformIndexHtml(html) {
        const { meta } = JSON.parse(
          readFileSync(
            new URL("./src/data/site.json", import.meta.url),
            "utf8",
          ),
        );
        return html
          .replace(
            '<html lang="en">',
            `<html lang="${escapeHtml(meta.language)}">`,
          )
          .replace(
            "<title>Developer Portfolio</title>",
            `<title>${escapeHtml(meta.title)}</title><meta name="description" content="${escapeHtml(meta.description)}" />`,
          );
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
    allowedHosts: ["terminal.local"],
  },
});
