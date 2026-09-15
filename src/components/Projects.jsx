import SectionHeading from "./SectionHeading";
import Icon from "./Icon";
import SmartLink from "./SmartLink";
export default function Projects({ data, heading, labels }) {
  if (!data.enabled || !data.items.length) return null;
  return (
    <section
      id="projects"
      tabIndex={-1}
      className="section container"
      aria-labelledby="projects-title"
    >
      <SectionHeading {...heading} id="projects-title" />
      <div className="projects-grid">
        {data.items.map((item) => (
          <article className="project-card panel" key={item.id}>
            {item.image && (
              <img
                className="project-image"
                src={item.image.src}
                alt={item.image.alt}
                loading="lazy"
              />
            )}
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <div className="tags">
              {item.technologies.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="project-links">
              {item.url && (
                <SmartLink className="text-action" href={item.url}>
                  {labels.viewProject}
                  <Icon name="external" size={16} />
                </SmartLink>
              )}
              {item.sourceUrl && (
                <SmartLink className="text-action" href={item.sourceUrl}>
                  {labels.projectSource}
                  <Icon name="code" size={16} />
                </SmartLink>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
