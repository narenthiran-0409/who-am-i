export default function HeroHeading({ greeting, intro }) {
  let letterIndex = 0;
  const words = greeting.split(" ");
  const nameWords = intro.split(" ");
  return (
    <h1 className="hero-title" aria-label={`${greeting} ${intro}`}>
      <span className="hero-hello" aria-hidden="true">
        {words.map((word, wi) => (
          <span key={wi}>
            {wi > 0 && " "}
            <span className="hero-word">
              {[...word].map((ch, ci) => {
                const i = letterIndex++;
                return (
                  <span className="hero-letter" key={ci} style={{ "--i": i }}>
                    {ch}
                  </span>
                );
              })}
            </span>
          </span>
        ))}
        <span className="hero-sweep" />
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
