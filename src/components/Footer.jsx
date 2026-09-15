import { useState } from "react";
export default function Footer({ data }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const lang = showTranslation ? data.translationLanguage : data.language;
  const text = showTranslation ? data.translation : data.quote;
  return (
    <footer className="footer">
      <div className="container quote-block">
        <div aria-live="polite">
          <blockquote key={lang} lang={lang}>
            “{text}”
          </blockquote>
        </div>
        <button
          type="button"
          className="translation-toggle"
          onClick={() => setShowTranslation((value) => !value)}
          aria-pressed={showTranslation}
        >
          {showTranslation ? data.hideTranslation : data.showTranslation}
        </button>
      </div>
    </footer>
  );
}
