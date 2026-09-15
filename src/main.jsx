import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { site } from "./data";
import "./styles.css";
document.documentElement.lang = site.meta.language;
document.title = site.meta.title;
const meta = document.querySelector('meta[name="description"]');
if (meta) meta.content = site.meta.description;
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
