// js/theme.js
export function initThemeToggle() {
  const key = "mc_theme";
  const btn = document.getElementById("themeToggle");

  const saved = localStorage.getItem(key);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initial = saved || (prefersDark ? "dark" : "light");
  document.body.dataset.theme = initial;

  const applyIcon = () => {
    if (!btn) return;
    const t = document.body.dataset.theme || "light";
    btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    const icon = btn.querySelector("[data-icon]");
    if (icon) icon.textContent = t === "dark" ? "☀️" : "🌙";
  };

  applyIcon();

  if (btn) {
    btn.addEventListener("click", () => {
      const current = document.body.dataset.theme || "light";
      const next = current === "dark" ? "light" : "dark";
      document.body.dataset.theme = next;
      localStorage.setItem(key, next);
      applyIcon();
    });
  }
}
