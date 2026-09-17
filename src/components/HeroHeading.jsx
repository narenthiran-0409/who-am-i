import DottedTitle from "./hero/DottedTitle";
import TerminalName from "./hero/TerminalName";

export default function HeroHeading({ greeting, intro, title }) {
  return (
    <h1 className="hero-title" aria-label={`${greeting} ${intro}`}>
      <span className="hero-hello" aria-hidden="true">
        {title ? <DottedTitle title={title} /> : greeting}
      </span>
      <TerminalName text={intro} />
    </h1>
  );
}
