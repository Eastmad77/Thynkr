/* service-worker.js (v3) — same-origin only, Firebase/CDN-safe) */

const CACHE_NAME = 'whylee-v3';
const STATIC_ASSETS = [
  '/', '/index.html', '/game.html', '/menu.html',
  '/styles/brand.css', '/styles/style.css', '/styles/animations.css',
  '/styles/hud.css', '/styles/streakBar.css',
  '/scripts/boot/themeInit.js', '/scripts/boot/themeToggle.js',
];

// Only cache same-origin requests
function isSameOrigin(url) {
  try { return new URL(url).origin === self.location.origin; } catch { return false; }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(STATIC_ASSETS); } catch (e) { /* ignore */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(n => (n === CACHE_NAME ? null : caches.delete(n))));
    self.clients.claim();
  })());
});

// Cache-first for same-origin GET; bypass cross-origin (e.g., gstatic firebase)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only GET and only same-origin
  if (req.method !== 'GET' || !isSameOrigin(req.url)) {
    return; // let the browser handle it (no SW interception)
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // Optionally cache HTML/CSS/JS/Images served from same origin
      if (res.ok && (req.destination === 'document' || req.destination === 'style' || req.destination === 'script' || req.destination === 'image')) {
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      // Optional: offline fallback for nav requests
      if (req.mode === 'navigate') {
        const offline = await cache.match('/index.html');
        if (offline) return offline;
      }
      throw e;
    }
  })());
});
