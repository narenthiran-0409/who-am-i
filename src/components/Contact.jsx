import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import ContactSnackbar from "./contact/ContactSnackbar";
import { createRequestId, sendContact, validateContact } from "../utils/contact.mjs";

export default function Contact({ data }) {
  const [errors, setErrors] = useState({});
  const [state, setState] = useState("idle");
  const [notification, setNotification] = useState(null);
  const notificationId = useRef(0);
  const formRef = useRef(null);
  const sendButton = useRef(null);
  const dismissNotification = useCallback(() => setNotification(null), []);
  const notify = (kind, message = "", retryable = false) => {
    const box = sendButton.current?.getBoundingClientRect();
    setNotification({ id: ++notificationId.current, kind, message, retryable,
      origin: box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null });
  };
  const [messageLength, setMessageLength] = useState(0);
  const busy = useRef(false);
  const pending = useRef(null);
  const controller = useRef(null);
  const sendTimeout = useRef(null);
  const mounted = useRef(true);
  const locked = state === "sending" || state === "validating";

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); clearTimeout(sendTimeout.current); };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    const form = event.currentTarget;
    setState("validating");
    setNotification(null);
    const values = Object.fromEntries(new FormData(form));
    for (const key of ["name", "email", "subject", "message"]) values[key] = values[key]?.trim() || "";
    const invalid = validateContact(values, data.errors);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setState("error");
      notify("error", data.feedback.validation);
      form.elements.namedItem(Object.keys(invalid)[0])?.focus();
      busy.current = false;
      return;
    }
    // Reuse the key after a lost response so retrying cannot resend the same request.
    const fingerprint = JSON.stringify(values);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, id: createRequestId() };
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 25000);
    sendTimeout.current = timeout;
    setState("sending");
    try {
      await sendContact(values, pending.current.id, { signal: controller.current.signal });
      if (!mounted.current) return;
      form.reset();
      setMessageLength(0);
      setState("idle");
      setErrors({});
      notify("success");
      pending.current = null;
    } catch (error) {
      if (!mounted.current) return;
      setState("error");
      notify("error", data.feedback[error.code] || data.feedback.unavailable,
        ["network", "timeout", "unavailable", "pending"].includes(error.code));
      if (error.code === "validation") {
        const fieldErrors = {};
        for (const field of data.fields) {
          if (Object.keys(error.fields).some(key => key.toLowerCase() === field.name)) fieldErrors[field.name] = data.errors[field.name];
        }
        setErrors(fieldErrors);
        // Disabled state is rendered separately; fields stay focusable while readonly.
        form.elements.namedItem(Object.keys(fieldErrors)[0])?.focus();
      }
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      busy.current = false;
    }
  };

  return (
    <section id="contact" tabIndex={-1} className="contact container" aria-labelledby="contact-title">
      <div className="contact-inner">
        <div className="contact-lead">
        <span className="eyebrow">{data.eyebrow}</span>
        <h2 id="contact-title" aria-label={data.title}>{data.headingLead}<span>{data.headingAccent}</span></h2>
        </div>
        <div className="contact-card edge-glow edge-glow--ambient">
        <header className="contact-card-header">
          <span className="contact-card-icon"><Icon name={data.cardIcon} size={30} /></span>
          <div><span className="eyebrow">{data.cardEyebrow}</span><h3>{data.cardTitle}</h3><p>{data.cardDescription}</p></div>
        </header>
        <form ref={formRef} onSubmit={submit} noValidate aria-busy={locked}>
          <div className="contact-fields">
            {data.fields.map(field => {
              const common = {
                id: `contact-${field.name}`, name: field.name, placeholder: field.placeholder,
                maxLength: field.maxLength, required: true, readOnly: locked,
                "aria-invalid": !!errors[field.name],
                "aria-describedby": [errors[field.name] ? `error-${field.name}` : null, field.name === "message" ? "contact-message-count" : null].filter(Boolean).join(" ") || undefined,
                onChange: event => {
                  if (errors[field.name]) setErrors(previous => ({ ...previous, [field.name]: undefined }));
                  if (field.name === "message") setMessageLength(event.target.value.length);
                },
              };
              return (
                <div className={`field ${field.wide ? "field-wide" : ""}`} key={field.name}>
                  <label htmlFor={common.id}><Icon name={field.icon} size={16} />{field.label}<span className="contact-required" aria-hidden="true"> *</span></label>
                  {field.type === "textarea" ? <textarea {...common} rows={5} /> : <input {...common} type={field.type} autoComplete={field.autocomplete} />}
                  {field.name === "message" && <p className="contact-count" id="contact-message-count">{messageLength} / {field.maxLength} {data.characters}</p>}
                  {errors[field.name] && <p className="field-error" id={`error-${field.name}`}>{errors[field.name]}</p>}
                </div>
              );
            })}
          </div>
          <div className="contact-trap" aria-hidden="true">
            <label htmlFor="contact-website">{data.honeypotLabel}</label>
            <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" maxLength={200} />
          </div>
          <button ref={sendButton} type="submit" className="button button-primary" disabled={locked}>
            <Icon name="send" size={20} /><span>{locked ? "TRANSMITTING..." : data.submit}</span><Icon name="right" size={18} className="contact-send-arrow" />
          </button>
          <p className="form-helper">{data.helper}</p>
        </form>
        </div>
      </div>
      {notification && <ContactSnackbar key={notification.id} notification={notification}
        onDismiss={dismissNotification} onRetry={() => formRef.current?.requestSubmit()}
        returnFocus={sendButton.current} />}
    </section>
  );
}
