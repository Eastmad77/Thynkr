/* ==========================================================
   shell.v5015.js — Brain ⚡ Bolt (universal, defensive)
   - Works with IDs: menuButton/sideMenu OR mmMenuBtn/mmSideMenu
   - Safe null checks (prevents crashes)
   - Menu auto-hide after 5s
   - Start splash fallback fade
========================================================== */

console.log("[BrainBolt] Shell v5015 loaded");

document.addEventListener("DOMContentLoaded", () => {
  initMenuUniversal();
  initStartSplashFallback();
});

/* ---------- Menu (universal) ---------- */
function initMenuUniversal() {
  // Try modern IDs first, then legacy IDs
  const menuBtn =
    document.getElementById("menuButton") ||
    document.getElementById("mmMenuBtn");

  const sideMenu =
    document.getElementById("sideMenu") ||
    document.getElementById("mmSideMenu");

  if (!menuBtn || !sideMenu) {
    console.warn("[BrainBolt] Menu elements not found — skipping menu init");
    return;
  }

  // Defensive addEventListener
  try {
    menuBtn.addEventListener("click", () => {
      if (!sideMenu) return;
      sideMenu.classList.toggle("open");
      if (sideMenu.classList.contains("open")) {
        setTimeout(() => {
          if (sideMenu) sideMenu.classList.remove("open");
        }, 5000);
      }
    });
  } catch (e) {
    console.warn("[BrainBolt] Menu init failed:", e);
  }
}

/* ---------- Start Splash (fallback) ---------- */
function initStartSplashFallback() {
  const startSplash =
    document.getElementById("splashStart") ||
    document.getElementById("startSplash"); // support either id

  if (!startSplash) return;

  setTimeout(() => {
    if (!document.body.contains(startSplash)) return;
    startSplash.classList.add("hiding"); // CSS should animate opacity
    setTimeout(() => {
      if (startSplash.parentNode) startSplash.parentNode.removeChild(startSplash);
    }, 500);
  }, 2500);
}
