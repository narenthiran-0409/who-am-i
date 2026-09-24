import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../Icon";
import "./ContactSnackbar.css";

// The parent keys this component by notification ID, giving each message fresh timers.
export default function ContactSnackbar({ notification, onDismiss, onRetry, returnFocus }) {
  const panel = useRef(null);
  const remaining = useRef(7000);
  const [phase, setPhase] = useState("entering");
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [flight, setFlight] = useState(null);
  const [reduced, setReduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const success = notification.kind === "success";
  const paused = hovered || focused;
  const dismiss = useCallback(() => {
    if (panel.current?.contains(document.activeElement)) returnFocus?.focus({ preventScroll: true });
    setPhase("exiting");
  }, [returnFocus]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media?.addEventListener("change", change);
    return () => media?.removeEventListener("change", change);
  }, []);

  useLayoutEffect(() => {
    if (!success || reduced || !notification.origin) return;
    const box = panel.current.getBoundingClientRect();
    setFlight({
      left: notification.origin.x, top: notification.origin.y,
      "--signal-x": `${box.left + 30 - notification.origin.x}px`,
      "--signal-y": `${box.top + 30 - notification.origin.y}px`,
    });
  }, [notification, reduced, success]);

  useEffect(() => {
    if (phase !== "entering") return;
    const timer = setTimeout(() => setPhase("visible"), reduced ? 120 : success ? 600 : 240);
    return () => clearTimeout(timer);
  }, [phase, reduced, success]);

  useEffect(() => {
    if (phase !== "visible" || paused || !success) return;
    const start = Date.now();
    const timer = setTimeout(dismiss, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - start));
    };
  }, [phase, paused, success, dismiss]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const timer = setTimeout(onDismiss, reduced ? 120 : 180);
    return () => clearTimeout(timer);
  }, [phase, reduced, onDismiss]);

  useEffect(() => {
    const escape = event => { if (event.key === "Escape") dismiss(); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [dismiss]);

  return createPortal(
    <>
      {success && !reduced && phase === "entering" && flight &&
        <span className="contact-signal" style={flight} aria-hidden="true" />}
      <aside ref={panel} className={`contact-snackbar contact-snackbar--${notification.kind}`}
        data-phase={phase} data-paused={paused} data-reduced={reduced}
        aria-label={success ? "Message received notification" : "Message sending problem"}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
        <span className="contact-snackbar-icon" aria-hidden="true"><Icon name={success ? "send" : "mail"} size={22} /></span>
        <div className="contact-snackbar-copy" role={success ? "status" : "alert"}
          aria-live={success ? "polite" : "assertive"} aria-atomic="true">
          <p className="contact-snackbar-label">{success ? "MESSAGE_RECEIVED 📡" : "ACTION_REQUIRED"}</p>
          {success ? <>
            <p className="contact-snackbar-message">Successfully landed in my inbox — no 404s here 😎</p>
            <p className="contact-snackbar-support">Thanks for reaching out!<br />I’ll get back to you soon. 🚀</p>
          </> : <p className="contact-snackbar-support">{notification.message}</p>}
        </div>
        <button type="button" className="contact-snackbar-close" aria-label="Dismiss notification" onClick={dismiss}>
          <Icon name="close" size={18} />
        </button>
        {!success && notification.retryable && <button type="button" className="contact-snackbar-retry" onClick={onRetry}>RETRY</button>}
        {success && <span className="contact-snackbar-progress" aria-hidden="true" />}
      </aside>
    </>, document.body,
  );
}
