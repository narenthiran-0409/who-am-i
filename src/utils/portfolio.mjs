import schema from "./portfolio-schema.json" with { type: "json" };
import { resolveProfileExperience } from "./experience.mjs";

// Preserve the rendering contract while allowing different content and array lengths.
function matches(value, sample) {
  if (sample === null) return true;
  if (Array.isArray(sample)) return Array.isArray(value) && value.every(item =>
    sample.length === 0 || sample.some(example => matches(item, example)));
  if (typeof sample === "object") return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.entries(sample).every(([key, example]) => matches(value[key], example));
  return typeof value === sample;
}

function safeLinks(value, key = "") {
  if (typeof value === "string" && /^(href|src|url|generatedUrl|fallbackImage|projectUrl|sourceUrl)$/i.test(key)) {
    return !/[\u0000-\u0020\u007f\\]/.test(value) && /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/.test(value);
  }
  return !value || typeof value !== "object" || Object.entries(value).every(([k, v]) => safeLinks(v, k));
}

export function validPortfolio(payload) {
  return payload?.schemaVersion === 1 && matches(payload.data, schema) && safeLinks(payload.data);
}

export async function fetchPortfolio({ fetcher = fetch, signal } = {}) {
  const base = (import.meta.env?.VITE_PORTFOLIO_API_BASE_URL || import.meta.env?.VITE_CONTACT_API_BASE_URL || "").replace(/\/$/, "");
  const response = await fetcher(`${base}/api/portfolio`, { signal, cache: "no-store", credentials: "omit", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Portfolio API unavailable");
  const payload = await response.json();
  if (!validPortfolio(payload)) throw new Error("Invalid portfolio content");
  return { ...payload.data, profile: resolveProfileExperience(payload.data.profile, payload.data.journey) };
}
