import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
export default function Navigation({ data }) {
  const [open, setOpen] = useState(false);
  const container = useRef(null);
  const toggle = useRef(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (e) => {
      if (!container.current?.contains(e.target)) setOpen(false);
    };
    const escape = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className="navigation"
      ref={container}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={toggle}
        className="nav-toggle"
        aria-label={open ? data.close : data.open}
        aria-expanded={open}
        aria-controls="portfolio-navigation"
        onClick={() => setOpen(!open)}
      >
        <Icon name={open ? "close" : "menu"} />
      </button>
      <nav
        id="portfolio-navigation"
        className="nav-panel"
        aria-label={data.label}
        hidden={!open}
      >
        {data.items.map((item) => (
          <a
            key={item.target}
            href={"#" + item.target}
            onClick={() => {
              setOpen(false);
              document
                .getElementById(item.target)
                ?.focus({ preventScroll: true });
            }}
          >
            <span className="tree-dot" />
            {item.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
