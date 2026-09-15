import { useState } from "react";
import Icon from "./Icon";
import { buildContactDraft, validateContact } from "../utils/content.mjs";
export default function Contact({ data }) {
  const [errors, setErrors] = useState({});
  const [draft, setDraft] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    const next = validateContact(values, data.errors);
    setErrors(next);
    if (Object.keys(next).length) {
      e.currentTarget.elements.namedItem(Object.keys(next)[0]).focus();
      return;
    }
    const prepared = buildContactDraft(values, data);
    setDraft(prepared);
    setCopyStatus("");
    window.location.href = prepared.href;
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.body);
      setCopyStatus(data.copied);
    } catch {
      setCopyStatus(data.copyFailed);
    }
  };
  return (
    <section
      id="contact"
      tabIndex={-1}
      className="contact container"
      aria-labelledby="contact-title"
    >
      <div className="contact-inner">
        <span className="eyebrow">{data.eyebrow}</span>
        <h2 id="contact-title">{data.title}</h2>
        <form onSubmit={submit} noValidate>
          <div className="contact-fields">
            {data.fields.map((field) => {
              const common = {
                id: "contact-" + field.name,
                name: field.name,
                placeholder: field.placeholder,
                maxLength: field.maxLength,
                required: true,
                "aria-invalid": !!errors[field.name],
                "aria-describedby": errors[field.name]
                  ? "error-" + field.name
                  : undefined,
                onChange: () => {
                  if (errors[field.name])
                    setErrors((prev) => ({ ...prev, [field.name]: undefined }));
                },
              };
              return (
                <div
                  className={
                    "field " + (field.type === "textarea" ? "field-wide" : "")
                  }
                  key={field.name}
                >
                  <label htmlFor={common.id}>{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea {...common} rows={4} />
                  ) : (
                    <input
                      {...common}
                      type={field.type}
                      autoComplete={field.autocomplete}
                    />
                  )}{" "}
                  {errors[field.name] && (
                    <p className="field-error" id={"error-" + field.name}>
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <button type="submit" className="button button-primary">
            {data.submit}
            <Icon name="send" size={20} />
          </button>
          <p className="form-helper">{data.helper}</p>
        </form>
        <div role="status" aria-live="polite">
          {draft && (
            <div className="draft-result">
              <p>{data.prepared}</p>
              <textarea
                readOnly
                aria-label={data.draftLabel}
                value={draft.body}
                rows={6}
              />
              <button type="button" className="text-action" onClick={copy}>
                {data.copy}
              </button>
              <p>{copyStatus}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
