// ======================================================
// The Daily Brain ⚡ Bolt — Service Worker v3.6.0
// ======================================================
// Features:
// • Navigation Preload (fast first paint)
// • Smart caching: cache-first for static assets, SWR for runtime
// • Always-fresh CSV quiz feed (never cached)
// • Auto-refresh on version change
// ======================================================

const STATIC = 'tdbb-static-v3.6.0';
const RUNTIME = 'tdbb-runtime-v3.6.0';

const ASSETS = [
  '/', '/index.html',
  '/style.css', '/app.js', '/shell.js',
  '/about.html','/contact.html','/privacy.html','/terms.html','/signin.html','/pro.html','/admin.html','/404.html',
  '/favicon.svg','/app-icon.svg','/header-graphic.svg','/icon-192.png','/icon-512.png',
  '/site.webmanifest'
];

// ------------------------------------------------------
// INSTALL: pre-cache core assets
// ------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ------------------------------------------------------
// ACTIVATE: clean old caches + enable navigation preload
// ------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (![STATIC, RUNTIME].includes(key)) return caches.delete(key);
    }));
    await self.clients.claim();
  })());
});

// ------------------------------------------------------
// Helper: detect Google Sheets CSV (must always fetch live)
// ------------------------------------------------------
const isSheetsCsv = (url) => {
  try {
    const u = new URL(url);
    const isSheets = u.hostname.includes('docs.google.com') && u.pathname.includes('/spreadsheets/');
    const isCsv = (u.search || '').includes('output=csv');
    return isSheets && isCsv;
  } catch { return false; }
};

// ------------------------------------------------------
// FETCH HANDLER
// ------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // --- 1️⃣ Google Sheets CSVs: network-only (no cache)
  if (isSheetsCsv(req.url)) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => Response.error()));
    return;
  }

  // --- 2️⃣ Navigations (SPA): use preload → network → cache fallback
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const network = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(STATIC);
        cache.put(req, network.clone());
        return network;
      } catch {
        const cache = await caches.open(STATIC);
        return (await cache.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // --- 3️⃣ Same-origin static files
  if (url.origin === self.location.origin) {
    if (ASSETS.includes(url.pathname)) {
      event.respondWith(cacheFirst(req));
    } else {
      event.respondWith(staleWhileRevalidate(req));
    }
    return;
  }

  // --- 4️⃣ Cross-origin: network-first fallback
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

// ------------------------------------------------------
// STRATEGIES
// ------------------------------------------------------
async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const res = await fetch(request);
  if (res && res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => cached || Response.error());
  return cached || fetchPromise;
}
