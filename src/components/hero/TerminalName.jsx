// Decorative copies share the JSON-driven text and its exact wrapping.
// HeroHeading supplies the single accessible label for the complete heading.
export default function TerminalName({ text }) {
  return (
    <span className="hero-name" aria-hidden="true">
      <span className="hero-name-text">{text}</span>
      <span className="hero-name-slice hero-name-slice--upper">{text}</span>
      <span className="hero-name-slice hero-name-slice--lower">{text}</span>
      <span className="hero-name-blocks">
        {Array.from({ length: 6 }, (_, index) => (
          <span className="hero-name-block" key={index} />
        ))}
      </span>
    </span>
  );
}
