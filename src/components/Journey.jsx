import Icon from "./Icon";
import SectionHeading from "./SectionHeading";
function Timeline({ items, label, type }) {
  return (
    <div className={"timeline-column " + type}>
      <h3 className="eyebrow timeline-label">
        <Icon name={type === "education" ? "school" : "briefcase"} size={17} />
        {label}
      </h3>
      <ol className="timeline">
        {items.map((item, i) => (
          <li key={item.id} className={i === 0 ? "current" : ""}>
            <article className="timeline-card panel">
              <div className="timeline-top">
                <div className="organization-icon">
                  {item.logo ? (
                    <img
                      src={item.logo.src}
                      alt={item.logo.alt}
                      loading="lazy"
                    />
                  ) : (
                    <Icon name={item.icon} size={24} />
                  )}
                </div>
                <span className="period">{item.period}</span>
              </div>
              <h4>{item.title}</h4>
              <p className="organization">{item.organization}</p>
              {item.description && <p>{item.description}</p>}
              {item.highlights && (
                <ul className="highlights">
                  {item.highlights.map((text) => (
                    <li key={text}>
                      <Icon name="arrow" size={15} />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
export default function Journey({ data, heading }) {
  return (
    <section
      id="experience-education"
      tabIndex={-1}
      className="journey section container"
      aria-labelledby="journey-title"
    >
      <SectionHeading {...heading} id="journey-title" />
      <div className="journey-grid">
        <Timeline
          items={data.education}
          label={data.educationLabel}
          type="education"
        />
        <Timeline
          items={data.experience}
          label={data.experienceLabel}
          type="experience"
        />
      </div>
    </section>
  );
}
