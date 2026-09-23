import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { createRequestId, sendContact, validateContact } from "../utils/contact.mjs";

export default function Contact({ data }) {
  const [errors, setErrors] = useState({});
  const [state, setState] = useState("idle");
  const [feedback, setFeedback] = useState("");
  const [messageLength, setMessageLength] = useState(0);
  const busy = useRef(false);
  const pending = useRef(null);
  const controller = useRef(null);
  const mounted = useRef(true);
  const locked = state === "sending" || state === "validating";

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    const form = event.currentTarget;
    setState("validating");
    setFeedback("");
    const values = Object.fromEntries(new FormData(form));
    for (const key of ["name", "email", "subject", "message"]) values[key] = values[key]?.trim() || "";
    const invalid = validateContact(values, data.errors);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setState("error");
      setFeedback(data.feedback.validation);
      form.elements.namedItem(Object.keys(invalid)[0])?.focus();
      busy.current = false;
      return;
    }
    // Reuse the key after a lost response so retrying cannot resend the same request.
    const fingerprint = JSON.stringify(values);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, id: createRequestId() };
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 25000);
    setState("sending");
    try {
      await sendContact(values, pending.current.id, { signal: controller.current.signal });
      if (!mounted.current) return;
      form.reset();
      setMessageLength(0);
      setState("success");
      setFeedback(data.feedback.success);
      pending.current = null;
    } catch (error) {
      if (!mounted.current) return;
      setState("error");
      setFeedback(data.feedback[error.code] || data.feedback.unavailable);
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
<<<<<<< HEAD
        <p className="contact-intro">{data.description}</p>
        </div>
        <div className="contact-card">
=======
        </div>
        <div className="contact-card edge-glow edge-glow--ambient">
>>>>>>> d2cccc1 (Initial commit)
        <header className="contact-card-header">
          <span className="contact-card-icon"><Icon name={data.cardIcon} size={30} /></span>
          <div><span className="eyebrow">{data.cardEyebrow}</span><h3>{data.cardTitle}</h3><p>{data.cardDescription}</p></div>
        </header>
        <form onSubmit={submit} noValidate aria-busy={locked}>
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
                  if (state === "success") { setState("idle"); setFeedback(""); }
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
          <button type="submit" className="button button-primary" disabled={locked}>
<<<<<<< HEAD
            <Icon name="send" size={20} />{locked ? data.sending : data.submit}<Icon name="right" size={18} className="contact-send-arrow" />
=======
            <Icon name="send" size={20} /><span>{locked ? data.sending : data.submit}</span><Icon name="right" size={18} className="contact-send-arrow" />
>>>>>>> d2cccc1 (Initial commit)
          </button>
          <p className="form-helper">{data.helper}</p>
          <div className={`contact-status contact-status--${state}`} role="status" aria-live="polite" aria-atomic="true">
            <span className="contact-status-code"><span className="contact-status-dot" aria-hidden="true" />{data.states[state]}</span>
            {feedback && <p>{feedback}</p>}
          </div>
        </form>
        </div>
      </div>
    </section>
  );
}
