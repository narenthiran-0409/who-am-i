export default function SectionHeading({ eyebrow, title, id }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={id}>{title}</h2>
    </div>
  );
}
