/* ==========================================================
   shell.js — Global UI Framework for The Daily Brain Bolt
   v5012 — Handles menus, splash screens, and transitions
   ========================================================== */

console.log("[BrainBolt] Shell loaded");

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initSplashScreens();
});

/* ---------- Menu ---------- */
function initMenu() {
  const menuButton = document.getElementById("menuButton");
  const sideMenu = document.getElementById("sideMenu");

  if (!menuButton || !sideMenu) {
    console.warn("[BrainBolt] Menu elements not found on this page — skipping initMenu()");
    return;
  }

  menuButton.addEventListener("click", () => {
    sideMenu.classList.toggle("open");

    // Auto-hide after 5 seconds if open
    if (sideMenu.classList.contains("open")) {
      setTimeout(() => {
        sideMenu.classList.remove("open");
      }, 5000);
    }
  });
}

/* ---------- Splash Screens ---------- */
function initSplashScreens() {
  const splashStart = document.getElementById("splashStart");
  const splashSuccess = document.getElementById("splashSuccess");
  const splashFail = document.getElementById("splashFail");

  // Only show start splash if it exists
  if (splashStart) {
    splashStart.classList.remove("hidden");
    setTimeout(() => splashStart.classList.add("hidden"), 2500);
  }

  // Success splash auto-hide (if used manually)
  if (splashSuccess) {
    splashSuccess.addEventListener("show", () => {
      splashSuccess.classList.remove("hidden");
      setTimeout(() => splashSuccess.classList.add("hidden"), 3000);
    });
  }

  // Fail splash auto-hide (if used manually)
  if (splashFail) {
    splashFail.addEventListener("show", () => {
      splashFail.classList.remove("hidden");
      setTimeout(() => splashFail.classList.add("hidden"), 3000);
    });
  }
}

/* ---------- Utility (optional manual trigger) ---------- */
window.showSplash = function(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 3000);
};
