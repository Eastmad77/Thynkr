/* ============================================================================
   Whylee Service Worker (v9005)
   - Same-origin only (no third-party/CDN fetches are intercepted)
   - Precache core shell; runtime cache for local images/css/js
   - Avoids caching Firebase CDN (gstatic) to prevent CSP/connect-src issues
   - Safe update flow (skipWaiting + clients.claim)
   ============================================================================ */

const SW_VERSION = "v9005";
const SW_PREFIX  = "wl-cache-";
const STATIC_CACHE = `${SW_PREFIX}${SW_VERSION}-static`;
const RUNTIME_CACHE = `${SW_PREFIX}${SW_VERSION}-runtime`;

// Minimal app shell for offline (only same-origin assets)
const PRECACHE_URLS = [
  "/",                    // SPA shell
  "/index.html",
  "/menu.html",
  "/game.html",
  "/pro.html",
  "/profile.html",
  "/leaderboard.html",
  "/about.html",
  "/contact.html",
  "/privacy.html",
  "/terms.html",

  // Styles (versioned to bust cache)
  "/styles/brand.css?v=9005",
  "/styles/style.css?v=9005",
  "/styles/animations.css?v=9005",
  "/styles/hud.css?v=9005",
  "/styles/streakBar.css?v=9005",

  // Local scripts only (we do NOT precache external CDN scripts)
  "/scripts/firebase-config.js?v=9005",
  "/scripts/firebase-bridge.js?v=9005",
  "/scripts/ui/streakBar.js?v=9005",
  "/scripts/components/pips.js?v=9005",
  "/scripts/components/avatarBadge.js?v=9005",
  "/scripts/ai/questionEngine.js?v=9005",
  "/scripts/entitlements.js?v=9005",
  "/scripts/milestones.js?v=9005",
  "/scripts/game.js?v=9005",

  // A couple of local images/icons used across pages
  "/media/icons/favicon-48.png",
  "/media/icons/whylee-icon-192.png",
  "/media/icons/whylee-icon-512.png"
];

// Utility: is this request same-origin?
function isSameOrigin(url) {
  try {
    const u = new URL(url);
    return u.origin === self.location.origin;
  } catch {
    return false;
  }
}

// Install: pre-cache static shell
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE_URLS);
    // Activate latest worker ASAP
    await self.skipWaiting();
  })());
});

// Activate: clean old versions
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.startsWith(SW_PREFIX) && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Fetch: only handle same-origin GET requests. Never touch cross-origin (e.g., gstatic).
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // We only care about GET from same origin
  if (req.method !== "GET" || !isSameOrigin(req.url)) {
    // Let the browser handle cross-origin (prevents CSP/connect-src violations)
    return;
  }

  const url = new URL(req.url);

  // Strategy: HTML navigation → Network-first (fallback cache)
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        // Optionally update runtime cache
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        // offline fallback to cached shell/pages
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(req)) || (await cache.match("/index.html"));
      }
    })());
    return;
  }

  // For CSS/JS/images on same origin → Stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(req);
    const fetchAndUpdate = fetch(req).then((res) => {
      // Only cache successful, basic responses
      if (res && res.status === 200 && res.type === "basic") {
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => cached); // fall back to cached on network error

    // Return cached immediately if present, update in background
    return cached || fetchAndUpdate;
  })());
});

// Messaging: allow page to request immediate activation
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
