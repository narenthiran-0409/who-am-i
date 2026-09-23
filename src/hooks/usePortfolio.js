import { useCallback, useEffect, useRef, useState } from "react";
import * as fallback from "../data";
import { cachedPortfolio, fetchPortfolio } from "../utils/portfolio.mjs";

function storage() { try { return window.localStorage; } catch { return undefined; } }

export default function usePortfolio() {
  const [data, setData] = useState(() => cachedPortfolio(fallback, storage()));
  const [status, setStatus] = useState("checking");
  const [hasFailed, setHasFailed] = useState(false);
  const [viewingSaved, setViewingSaved] = useState(false);
  const request = useRef(null);
  const alive = useRef(false);
  const retry = useCallback(async () => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setStatus("checking");
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const result = await fetchPortfolio(fallback, { storage: storage(), signal: controller.signal });
      if (!alive.current || request.current !== controller) return;
      if (controller.signal.aborted) throw new Error("Request timed out");
      setData(result);
      setStatus("online");
      setHasFailed(false);
      setViewingSaved(false);
    } catch {
      if (alive.current && request.current === controller) {
        setStatus("unavailable");
        setHasFailed(true);
      }
    } finally {
      clearTimeout(timer);
      if (request.current === controller) request.current = null;
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    retry();
    return () => {
      alive.current = false;
      request.current?.abort();
      request.current = null;
    };
  }, [retry]);
  useEffect(() => {
    document.documentElement.lang = data.site.meta.language;
    document.title = data.site.meta.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = data.site.meta.description;
  }, [data.site]);
  return { data, status, showOutage: hasFailed && !viewingSaved, viewingSaved, retry,
    viewSaved: () => setViewingSaved(true) };
}
