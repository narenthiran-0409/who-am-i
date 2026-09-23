const cacheKey = "portfolio-content-v1";
const cacheLifetime = 7 * 24 * 60 * 60 * 1000;

// Preserve the rendering contract while allowing different content and array lengths.
function matches(value, sample) {
  if (sample === null) return true;
  if (Array.isArray(sample)) return Array.isArray(value) && value.every(item =>
    sample.length === 0 || sample.some(example => matches(item, example)));
  if (typeof sample === "object") return value !== null && typeof value === "object" && !Array.isArray(value)
    && Object.entries(sample).every(([key, example]) => matches(value[key], example));
  return typeof value === typeof sample;
}

function safeLinks(value, key = "") {
  if (typeof value === "string" && /^(href|src|url|generatedUrl|fallbackImage|projectUrl|sourceUrl)$/i.test(key)) {
    return !/[\u0000-\u0020\u007f\\]/.test(value) && /^(https?:\/\/|mailto:|tel:|#|\/(?!\/))/.test(value);
  }
  return !value || typeof value !== "object" || Object.entries(value).every(([k, v]) => safeLinks(v, k));
}

export function validPortfolio(payload, fallback) {
  return payload?.schemaVersion === 1 && matches(payload.data, fallback) && safeLinks(payload.data);
}

export function cachedPortfolio(fallback, storage) {
  try {
    const cached = JSON.parse(storage?.getItem(cacheKey) || "null");
    if (cached && Date.now() - cached.savedAt < cacheLifetime && validPortfolio(cached.payload, fallback))
      return cached.payload.data;
  } catch { /* Private mode, quota errors and old cache must not break the portfolio. */ }
  return fallback;
}

export async function fetchPortfolio(fallback, { fetcher = fetch, storage, signal } = {}) {
  const base = (import.meta.env?.VITE_PORTFOLIO_API_BASE_URL || import.meta.env?.VITE_CONTACT_API_BASE_URL || "").replace(/\/$/, "");
  const response = await fetcher(`${base}/api/portfolio`, { signal, credentials: "omit", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Portfolio API unavailable");
  const payload = await response.json();
  if (!validPortfolio(payload, fallback)) throw new Error("Invalid portfolio content");
  try { storage?.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), payload })); } catch { /* Optional cache. */ }
  return payload.data;
}
