import Icon from "./Icon";
import SectionHeading from "./SectionHeading";
import CardRail from "./CardRail";
export default function Skills({ items, heading, labels }) {
  return (
    <section
      id="skills"
      tabIndex={-1}
      className="section container"
      aria-labelledby="skills-title"
    >
      <SectionHeading {...heading} id="skills-title" />
      <CardRail className="skills-rail" label={heading.title}
        previous={labels.previous} next={labels.next}>
        {items.map((skill) => (
<<<<<<< HEAD
          <article className="skill-card" key={skill.id}>
=======
          <article className="skill-card edge-glow" key={skill.id}>
>>>>>>> d2cccc1 (Initial commit)
            <div className="skill-icon">
              <Icon name={skill.icon} size={24} />
            </div>
            <h3>{skill.name}</h3>
            <span className="eyebrow">{skill.category}</span>
          </article>
        ))}
      </CardRail>
    </section>
  );
}
