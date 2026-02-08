// js/theme.js
const KEY = "mc_theme";

export function setTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem(KEY, t); } catch {}
  updateThemeIcon(t);


  updateThemeLogos(t);
}

export function getTheme() {
  const saved = (() => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  })();
  if (saved === "dark" || saved === "light") return saved;


  return "light";
}

export function initThemeToggle() {


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


  const icon = btn.querySelector?.("[data-icon]");
  const v = theme === "dark" ? "☀️" : "🌙";
  if (icon) icon.textContent = v;
  else btn.textContent = v;

  btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
}

function updateThemeLogos(theme){
  // Qualquer <img> com data-logo-dark e data-logo-light troca automaticamente
  const imgs = document.querySelectorAll("img[data-logo-dark][data-logo-light]");
  imgs.forEach(img => {
    const darkSrc = img.getAttribute("data-logo-dark");
    const lightSrc = img.getAttribute("data-logo-light");
    if (!darkSrc || !lightSrc) return;
    img.src = (theme === "dark") ? darkSrc : lightSrc;
  });
}
