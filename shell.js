/* ==========================================================
   shell.js — Brain ⚡ Bolt (universal, defensive)
   - Supports IDs: menuButton/sideMenu OR mmMenuBtn/mmSideMenu
   - Safe null checks (no crashes)
   - Menu auto-hide after 5s
   - Start splash fallback fade
========================================================== */

console.log("[BrainBolt] Shell loaded");

document.addEventListener("DOMContentLoaded", () => {
  initMenuUniversal();
  initStartSplashFallback();
});

/* ---------- Menu (universal) ---------- */
function initMenuUniversal() {
  // Try the new IDs first, then the old IDs
  const menuBtn =
    document.getElementById("menuButton") ||
    document.getElementById("mmMenuBtn");

  const sideMenu =
    document.getElementById("sideMenu") ||
    document.getElementById("mmSideMenu");

  if (!menuBtn || !sideMenu) {
    console.warn("[BrainBolt] Menu elements not found on this page — skipping initMenu()");
    return;
  }

  menuBtn.addEventListener("click", () => {
    sideMenu.classList.toggle("open");
    if (sideMenu.classList.contains("open")) {
      setTimeout(() => sideMenu.classList.remove("open"), 5000);
    }
  });
}

/* ---------- Start Splash (fallback) ---------- */
function initStartSplashFallback() {
  const startSplash =
    document.getElementById("splashStart") ||
    document.getElementById("startSplash"); // support either id

  if (!startSplash) return;

  // If it's still around after ~2.5s, fade it out
  setTimeout(() => {
    if (!document.body.contains(startSplash)) return;
    startSplash.classList.add("hiding"); // your CSS should handle opacity transition
    setTimeout(() => {
      if (startSplash.parentNode) startSplash.parentNode.removeChild(startSplash);
    }, 500);
  }, 2500);
}
