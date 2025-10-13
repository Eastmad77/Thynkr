/* ===========================================================================
   Whylee Service Worker (v7000)
   - Cache-first app shell with safe media handling
   - Navigation Preload
   - Broadcasts `NEW_VERSION` to clients on activate
   - Supports client-initiated `SKIP_WAITING`
   =========================================================================== */

const VERSION = '7000';
const CACHE_NAME = `whylee-cache-v${VERSION}`;

// Keep this list tight: only core shell & always-needed assets.
// Feature/content assets should be cached as fetched.
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/style.css?v=7000',
  '/styles/animations.css?v=7000',
  '/app.js?v=7000',
  '/shell.js?v=7000',
  '/js/ui/updatePrompt.js?v=7000',

  // Icons / Manifest
  '/site.webmanifest?v=7000',
  '/media/icons/whylee-icon-192.png',
  '/media/icons/whylee-icon-512.png',
  '/media/icons/whylee-maskable-512.png',
  '/media/icons/whylee-fox.svg'
];

/* -----------------------------
   Install: pre-cache core shell
------------------------------ */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
  })());
  // Activate immediately (we’ll still wait to claim in activate)
  self.skipWaiting();
});

/* ------------------------------------
   Activate: clean old caches + preload
------------------------------------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Remove old caches
    const names = await caches.keys();
    await Promise.all(names
      .filter(n => n !== CACHE_NAME)
      .map(n => caches.delete(n)));

    // Enable Navigation Preload where supported
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();

    // Notify all clients that a new version is live
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'NEW_VERSION', version: VERSION });
    }
  })());
});

/* ----------------------------------------------------
   Utility helpers
----------------------------------------------------- */
const isHTMLRequest = (req) =>
  req.mode === 'navigate' ||
  (req.destination === 'document') ||
  (req.headers.get('accept') || '').includes('text/html');

const isRangeRequest = (req) => req.headers.has('range');

const sameOrigin = (url) => url.origin === self.location.origin;

/* ----------------------------------------------------
   Fetch strategy
   - Navigations: cached index.html shell, then update in bg
   - Core/static: cache-first
   - JSON/API: network-first, fallback to cache
   - Media: avoid caching range responses and big streams
----------------------------------------------------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  // Avoid partial content fetch control
  if (isRangeRequest(req)) return;

  // Handle navigations to keep SPA instant
  if (isHTMLRequest(req)) {
    event.respondWith(handleNavigation(event));
    return;
  }

  // Non-navigation requests
  event.respondWith(handleAsset(event));
});

/* -----------------------------
   Navigation handler
------------------------------ */
async function handleNavigation(event) {
  const cache = await caches.open(CACHE_NAME);

  // Try cached index shell first
  const cached = await cache.match('/index.html', { ignoreSearch: true });
  if (cached) {
    // Background refresh of index.html
    event.waitUntil(refreshIndex(cache));
    return cached;
  }

  // Else try navigation preload or network
  try {
    const preload = await event.preloadResponse;
    const res = preload || await fetch(event.request);
    // cache an up-to-date index for next time
    try {
      const freshIndex = await fetch('/index.html', { cache: 'no-store' });
      if (freshIndex.ok) await cache.put('/index.html', freshIndex.clone());
    } catch {}
    return res;
  } catch (err) {
    // Minimal offline fallback
    return new Response(
      '<!doctype html><title>Offline</title>' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<style>body{background:#0b1220;color:#e6eef8;font:16px system-ui;margin:0;padding:24px}</style>' +
      '<h1>Offline</h1><p>Whylee is offline. Reconnect to continue.</p>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function refreshIndex(cache) {
  try {
    const fresh = await fetch('/index.html', { cache: 'no-store' });
    if (fresh && fresh.ok) await cache.put('/index.html', fresh.clone());
  } catch {}
}

/* -----------------------------
   Asset handler
------------------------------ */
async function handleAsset(event) {
  const req = event.request;
  const url = new URL(req.url);
  const cache = await caches.open(CACHE_NAME);

  // Media (audio/video): prefer network, fallback to cache, do not store partials
  if (['audio', 'video'].includes(req.destination)) {
    try {
      // Avoid caching big opaque or partial media
      const res = await fetch(req, { cache: 'no-store' });
      return res;
    } catch {
      const fallback = await cache.match(req, { ignoreSearch: true });
      if (fallback) return fallback;
      return new Response(null, { status: 504, statusText: 'Offline media' });
    }
  }

  // JSON/API: network-first with cache fallback (same-origin only)
  if (req.destination === '' && req.headers.get('accept')?.includes('application/json')) {
    if (sameOrigin(url)) {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        // Cache successful JSON for resilience
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        return new Response(JSON.stringify({ offline: true }), {
          status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }
    }
  }

  // Core & static assets (CSS/JS/Images): cache-first
  if (sameOrigin(url) && (
      req.destination === 'style' ||
      req.destination === 'script' ||
      req.destination === 'image' ||
      CORE_ASSETS.some(p => url.pathname === p || url.pathname === p.split('?')[0])
    )) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // Cache only clean OK responses
      if (res.ok && res.status === 200 && res.type !== 'opaqueredirect') {
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      // Try a query-stripped fallback (e.g., /style.css?v=7000 → /style.css)
      const stripped = await cache.match(req.url.split('?')[0]);
      if (stripped) return stripped;
      throw err;
    }
  }

  // All others: network-first
  try {
    return await fetch(req, { cache: 'no-store' });
  } catch {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    return new Response(null, { status: 504, statusText: 'Offline' });
  }
}

/* -----------------------------
   Client → SW messages
------------------------------ */
self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
