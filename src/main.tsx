import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root")!;

function renderApp() {
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Global error UI so any client runtime error won't be a blank page.
function showErrorOverlay(err: Error | string) {
  const msg = typeof err === "string" ? err : (err && (err.stack || err.message)) || String(err);
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.left = "0";
  overlay.style.top = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(10,10,10,0.95)";
  overlay.style.color = "#fff";
  overlay.style.zIndex = "999999";
  overlay.style.padding = "20px";
  overlay.style.overflow = "auto";
  overlay.innerHTML = `<h2 style="color:#ffd2a6">Client runtime error</h2>
    <pre style="white-space:pre-wrap;font-size:13px">${escapeHtml(msg)}</pre>
    <p style="opacity:0.8">Open browser devtools console for more details.</p>`;
  document.body.innerHTML = "";
  document.body.appendChild(overlay);
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

window.addEventListener("error", (ev) => {
  ev.preventDefault();
  showErrorOverlay(ev.error || ev.message || "Unknown error");
});

window.addEventListener("unhandledrejection", (ev) => {
  ev.preventDefault();
  showErrorOverlay(ev.reason || "Unhandled promise rejection");
});

try {
  renderApp();
} catch (e) {
  showErrorOverlay(e as any);
}

