import { useEffect, useState } from "react";
import * as fallback from "../data";
import { cachedPortfolio, fetchPortfolio } from "../utils/portfolio.mjs";

function storage() { try { return window.localStorage; } catch { return undefined; } }

export default function usePortfolio() {
  const [data, setData] = useState(() => cachedPortfolio(fallback, storage()));
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    fetchPortfolio(fallback, { storage: storage(), signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(() => { /* Keep last-known or bundled public content; contact works independently. */ })
      .finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, []);
  useEffect(() => {
    document.documentElement.lang = data.site.meta.language;
    document.title = data.site.meta.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = data.site.meta.description;
  }, [data.site]);
  return data;
}
