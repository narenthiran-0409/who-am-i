import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
export default function CardRail({
  children,
  label,
  previous,
  next,
  className = "",
}) {
  const rail = useRef(null);
  const [state, setState] = useState({
    start: true,
    end: false,
    overflow: false,
  });
  useEffect(() => {
    const el = rail.current;
    const update = () =>
      setState({
        start: el.scrollLeft < 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
        overflow: el.scrollWidth > el.clientWidth + 2,
      });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);
  const scroll = (direction) =>
    rail.current.scrollBy({
      left:
        direction *
        (rail.current.firstElementChild?.getBoundingClientRect().width + 32 ||
          rail.current.clientWidth),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  return (
    <div className={"rail-container " + className}>
      <div
        ref={rail}
        className="card-rail"
        role="region"
        aria-label={label}
        tabIndex={state.overflow ? 0 : undefined}
      >
        {children}
      </div>
      {state.overflow && (
        <div className="rail-controls">
          <button
            className="icon-button"
            aria-label={previous + " " + label}
            disabled={state.start}
            onClick={() => scroll(-1)}
          >
            <Icon name="left" size={17} />
          </button>
          <button
            className="icon-button"
            aria-label={next + " " + label}
            disabled={state.end}
            onClick={() => scroll(1)}
          >
            <Icon name="right" size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
