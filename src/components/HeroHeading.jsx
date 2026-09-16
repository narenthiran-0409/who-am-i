import DottedTitle, { makeTitle } from "./hero/DottedTitle";

export default function HeroHeading({ greeting, intro }) {
  const title = makeTitle(greeting);
  const nameWords = intro.split(" ");
  return (
    <h1 className="hero-title" aria-label={`${greeting} ${intro}`}
      style={{ "--hero-title-duration": `${title?.duration ?? 0}s` }}>
      <span className="hero-hello" aria-hidden="true">
        {title ? <DottedTitle title={title} /> : greeting}
      </span>
      <span className="hero-name" aria-hidden="true">
        {nameWords.map((word, wi) => (
          <span key={wi}>
            {wi > 0 && " "}
            <span className="hero-name-mask">
              <span className="hero-name-word" style={{ "--i": wi }}>
                {word}
              </span>
            </span>
          </span>
        ))}
      </span>
    </h1>
  );
}
