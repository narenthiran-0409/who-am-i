import { useEffect, useRef } from "react";
import copy from "../data/outage.json";
import "./ServerTeaBreak.css";

export function ReconnectIcon() {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5M20 7l-3 3" /></svg>;
}

export default function ServerTeaBreak({ retrying, onRetry, onViewSaved }) {
  const title = useRef(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);
  return (
    <main className="tea-break" aria-labelledby="tea-break-title">
      <header className="tea-break-header">
        <div className="tea-break-brand"><span aria-hidden="true">&gt;_</span>{copy.brand}</div>
        <span className="tea-break-badge">{retrying ? copy.retryBadge : copy.badge}</span>
      </header>
      <div className="tea-break-content">
        <div className="tea-break-art" role="img" aria-label={copy.illustrationAlt}>
          <div className="tea-break-art-crop"><img src={copy.illustration} alt="" width="1584" height="992" fetchPriority="high" /></div>
          <span className="tea-break-sleep" aria-hidden="true"><i>z</i><i>Z</i><i>Z</i></span>
          <svg className="tea-break-steam" viewBox="0 0 60 100" fill="none" aria-hidden="true"><path d="M20 95C50 65 0 60 25 35S30 15 25 5M40 90C65 65 25 55 42 30" /></svg>
          <span className="tea-break-spark" /><span className="tea-break-spark tea-break-spark-second" />
        </div>
        <p className="tea-break-eyebrow">{copy.eyebrow}</p>
        <h1 id="tea-break-title" ref={title} tabIndex={-1}>{copy.headline}<span>{copy.headlineAccent}</span></h1>
        <p className="tea-break-subheading">{copy.subheading}</p>
        <p className="tea-break-description">{copy.description}</p>
        <div className="tea-break-actions">
          <button className="tea-break-retry" onClick={onRetry} disabled={retrying}><ReconnectIcon />{retrying ? copy.retrying : copy.retry}</button>
          <button className="tea-break-saved" onClick={onViewSaved}>{copy.viewSaved}</button>
        </div>
        <p className="tea-break-terminal" role="status"><span aria-hidden="true" />{retrying ? copy.connecting : copy.waiting}</p>
        <p className="tea-break-note">{copy.note}</p>
      </div>
    </main>
  );
}
