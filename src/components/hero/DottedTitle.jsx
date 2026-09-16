import glyphs from "./dotGlyphs.json";

// Geometry is separate from portfolio copy. Unsupported text stays readable.
export function makeTitle(text) {
  const letters = Array.from(text.toUpperCase());
  if (!letters.length || letters.some((letter) => letter !== " " && !glyphs[letter])) {
    return null;
  }
  const dots = [];
  let column = 0;
  for (const letter of letters) {
    if (letter === " ") {
      column += 3;
      continue;
    }
    glyphs[letter].forEach((row, y) => {
      // A continuous, alternating scan draws each letter before the next.
      const columns = y % 2 ? [4, 3, 2, 1, 0] : [0, 1, 2, 3, 4];
      columns.forEach((x) => {
        if (row[x] === "1") dots.push({ x: (column + x) * 10 + 5, y: y * 10 + 5 });
      });
    });
    column += 6;
  }
  return dots.length ? { dots, width: (column - 1) * 10, duration: (dots.length - 1) * 0.04 + 0.3 } : null;
}

export default function DottedTitle({ title }) {
  return (
    <svg className="dotted-title" viewBox={`0 0 ${title.width} 70`}
      width={title.width} height="70" aria-hidden="true" focusable="false">
      {title.dots.map((dot, index) => (
        <g key={`${dot.x}-${dot.y}`} className="dotted-title-bulb"
          style={{ "--dot-delay": `${index * 0.04}s` }}
          transform={`translate(${dot.x} ${dot.y})`}>
          <circle className="dotted-title-blue" r="3.9" />
          <path className="dotted-title-star" d="M0-2.5 .65-.65 2.5 0 .65.65 0 2.5-.65.65-2.5 0-.65-.65Z" />
        </g>
      ))}
    </svg>
  );
}
