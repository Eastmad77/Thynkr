(function () {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const html = document.documentElement;
  const sync = () => { btn.textContent = html.getAttribute("data-theme") === "dark" ? "🌙" : "☀️"; };
  sync();
  btn.addEventListener("click", () => {
    const cur = html.getAttribute("data-theme") === "dark" ? "dark" : "light";
    const next = cur === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch {}
    sync();
  });
})();
