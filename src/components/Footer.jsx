<<<<<<< HEAD
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
=======
import { useEffect, useRef, useState } from "react";

export default function Footer({ data }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const card = useRef(null);
  const swapTimer = useRef(null);
  const swapFrame = useRef(null);
  const lang = showTranslation ? data.translationLanguage : data.language;
  const text = showTranslation ? data.translation : data.quote;

  useEffect(() => {
    const element = card.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible((current) => entry.isIntersecting === current ? current : entry.isIntersecting);
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    clearTimeout(swapTimer.current);
    cancelAnimationFrame(swapFrame.current);
  }, []);

  const toggleTranslation = () => {
    if (swapping) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShowTranslation((value) => !value);
      return;
    }
    setSwapping(true);
    swapTimer.current = setTimeout(() => {
      setShowTranslation((value) => !value);
      swapFrame.current = requestAnimationFrame(() => setSwapping(false));
    }, 140);
  };

  return (
    <footer className="footer">
      <div className="container quote-block">
        <div
          ref={card}
          className={`quote-card${revealed ? " is-revealed" : ""}${visible ? " is-visible" : ""}`}
        >

          <span className="quote-spark" aria-hidden="true" />
          <div className="quote-reveal-content">
            <div className={`quote-copy${swapping ? " is-swapping" : ""}`} aria-live="polite">
              <blockquote key={lang} lang={lang}>
                “{text}”
              </blockquote>
            </div>
          </div>
          <button
            type="button"
            className="translation-toggle"
            onClick={toggleTranslation}
            aria-pressed={showTranslation}
          >
            {showTranslation ? data.hideTranslation : data.showTranslation}
          </button>
        </div>
>>>>>>> d2cccc1 (Initial commit)
      </div>
    </footer>
  );
}
