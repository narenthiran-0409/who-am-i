import Icon from "./Icon";
import SectionHeading from "./SectionHeading";
export default function Skills({ items, heading }) {
  return (
    <section
      id="skills"
      tabIndex={-1}
      className="section container"
      aria-labelledby="skills-title"
    >
      <SectionHeading {...heading} id="skills-title" />
      <ul className="skills-grid">
        {items.map((skill) => (
          <li className="skill-card" key={skill.id}>
            <div className="skill-icon">
              <Icon name={skill.icon} size={24} />
            </div>
            <h3>{skill.name}</h3>
            <span className="eyebrow">{skill.category}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
