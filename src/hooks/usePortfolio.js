import { useEffect, useState } from "react";
import { fetchPortfolio } from "../utils/portfolio.mjs";

export default function usePortfolio() {
  const [state, setState] = useState({ data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState({ data: null, error: null });
    const timer = setTimeout(() => controller.abort(), 4000);
    fetchPortfolio({ signal: controller.signal })
      .then(data => { if (active) setState({ data, error: null }); })
      .catch(() => {
        if (active) setState({ data: null, error: "Unable to load the portfolio. Please try again." });
      })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [attempt]);
  useEffect(() => {
    if (!state.data) return;
    const { site } = state.data;
    document.documentElement.lang = site.meta.language;
    document.title = site.meta.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = site.meta.description;
  }, [state.data]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}
