import glyphs from "./dotGlyphs.json";

const DOT_INTERVAL = 0.04;
const DOT_FADE = 0.12;
const STROKE_PAUSE = 0.06;

// Geometry is separate from portfolio copy. Unsupported text stays readable.
export function makeTitle(text) {
  const letters = Array.from(text.toUpperCase());
  if (!letters.length || letters.some((letter) => letter !== " " && !glyphs[letter])) {
    return null;
  }
  const dots = [];
  let column = 0;
  let nextDelay = 0;
  for (const letter of letters) {
    if (letter === " ") {
      column += 3;
      continue;
    }
    const revealed = new Set();
    glyphs[letter].forEach((stroke, strokeIndex) => {
      // Follow handwriting strokes; shared intersections stay lit on retracing.
      if (strokeIndex > 0) nextDelay += STROKE_PAUSE;
      stroke.forEach(([x, y]) => {
        const key = `${x}-${y}`;
        if (!revealed.has(key)) {
          dots.push({ x: (column + x) * 10 + 5, y: y * 10 + 5, delay: nextDelay });
          revealed.add(key);
        }
        nextDelay += DOT_INTERVAL;
      });
    });
    // Complete this letter's final fade before beginning the next letter.
    nextDelay = Math.max(nextDelay, dots[dots.length - 1].delay + DOT_FADE);
    column += 6;
  }
  return dots.length ? { dots, width: (column - 1) * 10, duration: dots[dots.length - 1].delay + DOT_FADE } : null;
}

export default function DottedTitle({ title }) {
  return (
    <svg className="dotted-title" viewBox={`0 0 ${title.width} 70`}
      width={title.width} height="70" aria-hidden="true" focusable="false"
      style={{ "--dot-fade": `${DOT_FADE}s` }}>
      {title.dots.map((dot) => (
        <g key={`${dot.x}-${dot.y}`} className="dotted-title-bulb"
          style={{ "--dot-delay": `${dot.delay}s` }}
          transform={`translate(${dot.x} ${dot.y})`}>
          <circle className="dotted-title-blue" r="3.9" />
          <path className="dotted-title-star" d="M0-2.5 .65-.65 2.5 0 .65.65 0 2.5-.65.65-2.5 0-.65-.65Z" />
        </g>
      ))}
    </svg>
  );
}
