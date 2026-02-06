// js/theme.js
const STORAGE_KEY = "mc_theme";

function getPreferredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  // system preference
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function setTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(STORAGE_KEY, t);

  // Update aria-label / icon if button exists
  const btn = document.getElementById("themeToggle");
  if (btn) {
    const isDark = t === "dark";
    btn.setAttribute("aria-pressed", String(isDark));
    btn.setAttribute("aria-label", isDark ? "Ativar tema claro" : "Ativar tema escuro");
    const icon = btn.querySelector("[data-icon]");
    if (icon) icon.textContent = isDark ? "☀️" : "🌙";
  }
}

export function initThemeToggle() {
  // Apply theme ASAP
  setTheme(getPreferredTheme());

  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current === "dark" ? "light" : "dark");
  });
}
