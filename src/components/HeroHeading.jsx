import DottedTitle, { makeTitle } from "./hero/DottedTitle";
import TerminalName from "./hero/TerminalName";

export default function HeroHeading({ greeting, intro }) {
  const title = makeTitle(greeting);
  return (
    <h1 className="hero-title" aria-label={`${greeting} ${intro}`}
      style={{ "--hero-title-duration": `${title?.duration ?? 0}s` }}>
      <span className="hero-hello" aria-hidden="true">
        {title ? <DottedTitle title={title} /> : greeting}
      </span>
      <TerminalName text={intro} />
    </h1>
  );
}
