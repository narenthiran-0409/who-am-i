// Deterministic decorative noise: stable across renders and React Strict Mode.
const TERMINAL_GLYPHS = "01_/#<>[]{}";

function noiseFor(word, offset) {
  return Array.from(word, (_, index) =>
    TERMINAL_GLYPHS[(index * 3 + offset) % TERMINAL_GLYPHS.length],
  ).join("");
}

export default function TerminalName({ text }) {
  return (
    <span className="hero-name" aria-hidden="true">
      {text.split(" ").map((word, index) => (
        <span key={index}>
          {index > 0 && " "}
          <span className="hero-name-mask">
            <span
              className="hero-name-word"
              style={{ "--i": index }}
              data-noise-a={noiseFor(word, index)}
              data-noise-b={noiseFor(word, index + 4)}
              data-noise-c={noiseFor(word, index + 7)}
              data-text={word}
            >
              <span className="hero-name-text">{word}</span>
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}
