// /scripts/ui/posterManager.js  (v9002)
// Shows full-screen posters/splash screens with fade + SFX.
// Auto-swaps to Pro variants when available.
// Usage:  await showPoster("poster-success.jpg", { autoCloseMs: 2200 });

import { auth } from "/scripts/firebase-bridge.js";
import { isPro } from "/scripts/entitlements.js";

// ---- Config -----------------------------------------------------------------

// Map a free poster to its Pro replacement (if the asset exists).
// Use the same filename if you want the free one to remain for Pro as well.
const PRO_OVERRIDES = {
  "poster-gameover.jpg":  "poster-pro-retry.jpg",       // optional
  "poster-night.jpg":     "poster-pro-next-challenge.jpg",
  "poster-success.jpg":   "poster-pro-success.jpg"
};

// Optional sounds (place in /media/sfx). Non-blocking if missing.
const SFX = {
  success: "/media/sfx/success.mp3",
  gameover: "/media/sfx/fail.mp3",
  night: "/media/sfx/soft-chime.mp3"
};

// Which sound to play for common posters
const SOUND_FOR = {
  "poster-success.jpg": "success",
  "poster-pro-success.jpg": "success",
  "poster-gameover.jpg": "gameover",
  "poster-pro-retry.jpg": "gameover",
  "poster-night.jpg": "night",
  "poster-pro-next-challenge.jpg": "night"
};

// Preload helper
const _imgCache = new Map();
function preload(src) {
  if (_imgCache.has(src)) return _imgCache.get(src);
  const p = new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(src);
    img.onerror = rej;
    img.src = src;
  });
  _imgCache.set(src, p);
  return p;
}

// Play a sound if available (no error thrown if blocked or missing)
async function play(name) {
  const src = SFX[name];
  if (!src) return;
  try {
    const a = new Audio(src);
    a.volume = 0.9;
    await a.play();
  } catch(_) { /* ignore autoplay blocks */ }
}

// ---- DOM creation -----------------------------------------------------------

function ensureHost() {
  let host = document.getElementById("posterHost");
  if (host) return host;

  host = document.createElement("div");
  host.id = "posterHost";
  host.setAttribute("aria-live", "polite");
  host.style.position = "fixed";
  host.style.inset = "0";
  host.style.zIndex = "9999";
  host.style.display = "none";
  host.style.alignItems = "center";
  host.style.justifyContent = "center";
  host.style.background = "linear-gradient(180deg, rgba(2,7,18,.95), rgba(2,7,18,.98))";
  host.style.backdropFilter = "blur(6px)";
  host.style.transition = "opacity .35s ease";
  host.style.opacity = "0";

  const img = document.createElement("img");
  img.id = "posterImg";
  img.alt = "";
  img.decoding = "async";
  img.style.maxWidth = "min(92vw, 760px)";
  img.style.maxHeight = "88vh";
  img.style.borderRadius = "18px";
  img.style.boxShadow = "0 20px 70px rgba(0,0,0,.55)";
  img.style.transform = "translateY(8px)";
  img.style.transition = "transform .4s ease, filter .4s ease";
  img.style.filter = "drop-shadow(0 8px 24px rgba(0,0,0,.35))";

  host.appendChild(img);
  document.body.appendChild(host);
  return host;
}

// ---- Public API -------------------------------------------------------------

/**
 * Show a poster by filename inside /media/posters.
 * Options:
 *  - autoCloseMs: number | undefined  (auto dismiss after ms)
 *  - dismissOnTap: boolean (default true)
 *  - onClose: () => void               callback after fade-out
 *  - preferPro: boolean | undefined    force preferring pro variant
 */
export async function showPoster(file, opts = {}) {
  const {
    autoCloseMs,
    dismissOnTap = true,
    onClose,
    preferPro
  } = opts;

  const host = ensureHost();
  const img = host.querySelector("#posterImg");

  // Decide if we should swap to a Pro variant
  let chosen = `/media/posters/${file}`;
  try {
    const uid = auth.currentUser?.uid;
    const pro = preferPro ?? (uid ? await isPro(uid) : false);
    if (pro && PRO_OVERRIDES[file]) {
      chosen = `/media/posters/${PRO_OVERRIDES[file]}`;
    }
  } catch (_) { /* non-fatal */ }

  // Preload and swap
  await preload(chosen);
  img.src = chosen;

  // Play SFX if mapped
  const base = chosen.split("/").pop();
  const soundKey = SOUND_FOR[base];
  if (soundKey) play(soundKey);

  // Show
  host.style.display = "flex";
  // force reflow for transition
  void host.offsetWidth;
  host.style.opacity = "1";
  img.style.transform = "translateY(0)";

  // Dismiss handlers
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    host.style.opacity = "0";
    img.style.transform = "translateY(8px)";
    await new Promise(r => setTimeout(r, 380));
    host.style.display = "none";
    if (typeof onClose === "function") onClose();
  };

  let to;
  if (typeof autoCloseMs === "number" && autoCloseMs > 0) {
    to = setTimeout(close, autoCloseMs);
  }

  function onKey(e) {
    if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
      e.preventDefault(); close();
    }
  }
  function onTap() { close(); }

  if (dismissOnTap) host.addEventListener("click", onTap, { once: true });
  window.addEventListener("keydown", onKey, { once: true });

  // Return a disposer for callers that want manual control
  return () => {
    clearTimeout(to);
    window.removeEventListener("keydown", onKey, { once: true });
    host.removeEventListener("click", onTap, { once: true });
    close();
  };
}

// Convenience helpers
export async function showGameOverPoster() {
  return showPoster("poster-gameover.jpg", { autoCloseMs: 2200 });
}
export async function showNightPoster() {
  return showPoster("poster-night.jpg", { autoCloseMs: 2200 });
}
export async function showSuccessPoster() {
  return showPoster("poster-success.jpg", { autoCloseMs: 2400 });
}
