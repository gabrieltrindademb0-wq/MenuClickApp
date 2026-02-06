// js/theme.js
const KEY = "mc_theme";

export function setTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem(KEY, t); } catch {}
  updateThemeIcon(t);
}

export function getTheme() {
  const saved = (() => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  })();
  if (saved === "dark" || saved === "light") return saved;
  // padrão: claro
  return "light";
}

export function initThemeToggle() {
  // aplica tema salvo
  setTheme(getTheme());

  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    setTheme(current === "dark" ? "light" : "dark");
  });
}

function updateThemeIcon(theme) {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  // se você usa emoji/ícone dentro do botão:
  // exemplo: <button id="themeToggle">🌙</button>
  btn.textContent = theme === "dark" ? "☀️" : "🌙";
}
