// /theme/theme.js
export const ThemeManager = {
  init() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const saved = localStorage.getItem("whylee_theme");
    this.apply(saved || (prefersDark ? "dark" : "light"));
  },

  apply(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("whylee_theme", mode);
  },

  toggle() {
    const current = document.documentElement.getAttribute("data-theme");
    this.apply(current === "dark" ? "light" : "dark");
  },
};

// Hook example:
// document.getElementById("themeToggle").addEventListener("click", () => ThemeManager.toggle());
