import Icon from "./Icon";
import SectionHeading from "./SectionHeading";
const isCurrent = (item) => /\b(present|current|ongoing)\b/i.test(item.period ?? "");
function RoleDetails({ role }) {
  return <>
    {role.description && <p>{role.description}</p>}
    {role.highlights?.length > 0 && (
      <ul className="highlights">
        {role.highlights.map(text => (
          <li key={text}><Icon name="arrow" size={15} /><span>{text}</span></li>
        ))}
      </ul>
    )}
  </>;
}

function OrganizationTimeline({ item, labels }) {
  const roles = [item, ...(item.history ?? [])];
  return (
    <details className="organization-history">
      <summary>
        <span className="history-expand">{labels.expand}</span>
        <span className="history-collapse">{labels.collapse}</span>
        <span className="sr-only"> — {item.organization}</span>
      </summary>
      <ol className="organization-timeline">
        {roles.map(role => (
          <li key={role.id} className={isCurrent(role) ? "current-role" : "past-role"}>
            <span className={`timeline-status ${isCurrent(role) ? "is-current" : ""}`}>
              {isCurrent(role) ? labels.currentExperience : labels.pastExperience}
            </span>
            {role.period && <p className="role-period">{role.period}</p>}
            <h5>{role.title}</h5>
            <RoleDetails role={role} />
          </li>
        ))}
      </ol>
    </details>
  );
}

function Timeline({ items, label, type, timelineLabels }) {
  return (
    <div className={"timeline-column " + type}>
      <div className="timeline-heading">
      <h3 className="eyebrow timeline-label" id={`${type}-timeline-label`}>
        <Icon name={type === "education" ? "school" : "briefcase"} size={17} />
        {label}
      </h3>
      </div>
      <div className="timeline-scroll" role="region" aria-labelledby={`${type}-timeline-label`} tabIndex={0}>
      <ol className="timeline">
        {items.map((item) => (
          <li key={item.id} className={isCurrent(item) ? "current" : "past"}>
            <article className="timeline-card panel edge-glow">
              <span className={`timeline-status ${isCurrent(item) ? "is-current" : ""}`}>
                {type === "education"
                  ? (isCurrent(item) ? timelineLabels.currentEducation : timelineLabels.pastEducation)
                  : (isCurrent(item) ? timelineLabels.currentExperience : timelineLabels.pastExperience)}
              </span>
              <div className="timeline-top">
                <div className={`organization-icon${item.id === "sslc-hsc" ? " organization-icon-school" : item.id === "bsc-ct" ? " organization-icon-rathinam" : ""}`}>
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
              {type === "experience"
                ? <OrganizationTimeline item={item} labels={timelineLabels} />
                : <RoleDetails role={item} />}
            </article>
          </li>
        ))}
      </ol>
      </div>
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
          timelineLabels={data.timelineLabels}
        />
        <Timeline
          items={data.experience}
          label={data.experienceLabel}
          type="experience"
          timelineLabels={data.timelineLabels}
        />
      </div>
    </section>
  );
}
