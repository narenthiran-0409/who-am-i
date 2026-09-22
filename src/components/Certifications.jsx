import { useEffect, useRef, useState } from "react";
import SectionHeading from "./SectionHeading";
import CardRail from "./CardRail";
import Icon from "./Icon";
import SmartLink from "./SmartLink";
export default function Certifications({ items, heading, labels }) {
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  const close = () => {
    dialog.current?.close();
    setSelected(null);
    trigger.current?.focus();
  };
  return (
    <section
      id="certifications"
      tabIndex={-1}
      className="section container"
      aria-labelledby="certifications-title"
    >
      <SectionHeading {...heading} id="certifications-title" />
      <CardRail
        label={heading.title}
        previous={labels.previous}
        next={labels.next}
      >
        {items.map((item) => (
          <article className="certification-card" key={item.id}>
            <div className="certificate-visual">
              {item.image ? (
                <img src={item.image.src} alt={item.image.alt} loading="lazy" />
              ) : (
                <Icon name={item.icon} size={40} />
              )}
            </div>
            <div className="certificate-content">
              {item.badge && (
                <img
                  className="certificate-badge"
                  src={item.badge.src}
                  alt={item.badge.alt}
                  width={64}
                  height={64}
                  loading="lazy"
                />
              )}
              <div className="tags">
                {item.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.credentialUrl ? (
                <SmartLink href={item.credentialUrl} className="text-action">
                  {labels.viewCertificate}
                  <Icon name="right" size={16} />
                </SmartLink>
              ) : (
                <button
                  className="text-action"
                  onClick={(e) => {
                    trigger.current = e.currentTarget;
                    setSelected(item);
                  }}
                >
                  {labels.viewCertificate}
                  <Icon name="right" size={16} />
                </button>
              )}
            </div>
          </article>
        ))}
      </CardRail>
      <dialog
        ref={dialog}
        className="detail-dialog"
        aria-labelledby="certificate-dialog-title"
        onCancel={close}
        onClose={() => setSelected(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              close();
          }
        }}
      >
        {selected && (
          <>
            <button
              className="icon-button dialog-close"
              onClick={close}
              aria-label={labels.close}
              autoFocus
            >
              <Icon name="close" />
            </button>
            <Icon name={selected.icon} size={36} />
            <h2 id="certificate-dialog-title">{selected.title}</h2>
            <p>{selected.description}</p>
            <p className="detail-note">{labels.certificateNotice}</p>
          </>
        )}
      </dialog>
    </section>
  );
}
