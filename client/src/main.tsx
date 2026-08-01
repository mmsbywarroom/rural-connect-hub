import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// Hide HTML splash once React has painted
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const hide = (window as Window & { __hideAppSplash?: () => void }).__hideAppSplash;
    hide?.();
  });
});
