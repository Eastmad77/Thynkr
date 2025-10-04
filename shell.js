// ===== Brain ⚡ Bolt — shell.js v3.6 =====
// Shared nav + notification toggle + auto-hide sidebar

document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mmMenuBtn");
  const sideMenu = document.getElementById("mmSideMenu");
  const notifyItem = document.getElementById("notifyItem");

  let hideTimer = null;

  function openMenu() {
    sideMenu.classList.add("open");
    sideMenu.setAttribute("aria-hidden", "false");
    restartHideTimer();
  }
  function closeMenu() {
    sideMenu.classList.remove("open");
    sideMenu.setAttribute("aria-hidden", "true");
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  function toggleMenu() {
    if (sideMenu.classList.contains("open")) closeMenu();
    else openMenu();
  }
  function restartHideTimer() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(closeMenu, 5000); // auto-hide after 5s
  }

  // Toggle
  if (menuBtn && sideMenu) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });
  }

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!sideMenu.classList.contains("open")) return;
    if (!sideMenu.contains(e.target) && e.target !== menuBtn) closeMenu();
  });

  // Close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sideMenu.classList.contains("open")) closeMenu();
  });

  // Interactions inside menu
  sideMenu.addEventListener("click", (e) => {
    const a = e.target.tagName === "A" ? e.target : e.target.closest("a");
    if (a) { closeMenu(); return; }
    restartHideTimer(); // keep open but refresh timer
  });

  // Notifications toggle
  if (notifyItem) {
    notifyItem.addEventListener("click", () => {
      if (notifyItem.textContent.includes("OFF")) {
        notifyItem.textContent = "🔔 Notifications: ON";
        alert("You will be reminded daily!");
      } else {
        notifyItem.textContent = "🔕 Notifications: OFF";
      }
    });
  }
});
