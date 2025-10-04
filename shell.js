/* ==========================================================
   shell.js — Brain ⚡ Bolt
   Compatible with the “good” index.html (mmMenuBtn/mmSideMenu)
   - Safe null checks
   - Menu toggle + auto-hide after 5s
   - Optional start splash fade (redundant; app.js also hides it)
========================================================== */

console.log("[BrainBolt] Shell loaded");

document.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initStartSplashFallback();
  initNotificationsToggle(); // optional, only if #notifyItem exists
});

/* ---------- Menu ---------- */
function initMenu() {
  const menuBtn = document.getElementById("mmMenuBtn");
  const side = document.getElementById("mmSideMenu");
  if (!menuBtn || !side) {
    // Not all pages have a menu. Don't throw.
    return;
  }

  menuBtn.addEventListener("click", () => {
    side.classList.toggle("open");
    if (side.classList.contains("open")) {
      setTimeout(() => side.classList.remove("open"), 5000); // auto-hide after 5s
    }
  });
}

/* ---------- Start Splash (fallback / redundancy) ----------
   Your app.js already calls killStartSplash(), but this ensures
   the start splash fades out even if app.js is delayed.
---------------------------------------------------------- */
function initStartSplashFallback() {
  const startSplash = document.getElementById("startSplash");
  if (!startSplash) return;

  // If it's still around after ~2.5s, fade it out
  setTimeout(() => {
    if (!document.body.contains(startSplash)) return;
    startSplash.classList.add("hiding"); // CSS handles opacity transition
    setTimeout(() => startSplash.remove(), 500);
  }, 2500);
}

/* ---------- Notifications toggle (only if present) ---------- */
function initNotificationsToggle() {
  const item = document.getElementById("notifyItem");
  if (!item) return;

  function updateLabel(enabled) {
    item.textContent = enabled ? "🔔 Notifications: ON" : "🔕 Notifications: OFF";
  }

  updateLabel(Notification && Notification.permission === "granted");

  item.addEventListener("click", async () => {
    try {
      if (!("Notification" in window)) {
        alert("Notifications are not supported by your browser.");
        return;
      }
      if (Notification.permission === "granted") {
        updateLabel(true);
        return;
      }
      if (Notification.permission !== "denied") {
        const perm = await Notification.requestPermission();
        updateLabel(perm === "granted");
      } else {
        alert("Notifications are blocked in your browser settings.");
      }
    } catch (e) {
      console.warn("Notification request failed:", e);
    }
  });
}
