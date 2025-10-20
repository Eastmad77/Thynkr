try {
  const saved = localStorage.getItem("theme");
  const prefers = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", (saved === "dark" || (!saved && prefers)) ? "dark" : "light");
} catch {}
