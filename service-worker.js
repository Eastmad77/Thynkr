/* ============================================================================
   Whylee Service Worker — v7000
   - Cache-first for app shell & static assets
   - Stale-while-revalidate for images/posters/icons
   - Network-first for JSON/API/dynamic requests
   - Skips caching Range requests (audio/video streaming)
   - Navigation Preload for faster first paint online
   - Clean update flow with SKIP_WAITING + client toast support
   ============================================================================ */

/// ===== Version & cache keys =====
const VERSION = '7000';
const CACHE_CORE = `whylee-core-v${VERSION}`;
const CACHE_STATIC = `whylee-static-v${VERSION}`;
const CORE = [
  '/',                       // SPA entry
  '/index.html',
  '/style.css?v=7000',
  '/animations.css?v=7000',

  // Core JS
  '/app.js?v=7000',
  '/shell.js?v=7000',
  '/js/ui/updatePrompt.js',             // ES module via <script type="module"> or bundler
  '/scripts/config/gameRules.js',
  '/scripts/state/entitlements.js',
  '/scripts/billing/stripe.js',
  '/scripts/billing/play.js',

  // Manifest & icons
  '/site.webmanifest?v=7000',
  '/media/icons/whylee-icon-192.png',
  '/media/icons/whylee-icon-512.png',
  '/media/icons/maskable-icon.png',
  '/media/icons/whylee-fox.svg',
];

/// ===== Utility guards =====
const isHTML = (req) =>
  req.mode === 'navigate' ||
  req.destination === 'document' ||
  (req.headers.get('accept') || '').includes('text/html');

const isRangeRequest = (req) => req.headers.has('range');

const isSameOrigin = (url) => url.origin === self.location.origin;

const isStaticAsset = (req) => {
  const d = req.destination;
  return d === 'style' || d === 'script' || d === 'image' || d === 'font';
};

const isJSONorAPI = (req) => {
  const d = req.destination;
  return d === 'document' ? false : (d === '' || d === 'fetch');
};

const isMedia = (req) => req.destination === 'video' || req.destination === 'audio';

/// ===== Precache core on install =====
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_CORE);
    await cache.addAll(CORE);
  })());
  // We DON'T call skipWaiting here; the page will prompt user to update.
});

/// ===== Activate: cleanup old caches & enable navigation preload =====
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Remove old caches
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => ![CACHE_CORE, CACHE_STATIC].includes(k))
        .map((k) => caches.delete(k))
    );

    // Enable navigation preload for faster navigations
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }

    // Take control of open clients so we can serve from the new SW after user accepts
    await self.clients.claim();
  })());
});

/// ===== Message channel: skip waiting (from the Update toast) =====
self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/// ===== Fetch strategy =====
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // Avoid caching streaming/partial content
  if (isRangeRequest(req)) return;

  // 1) App navigations (shell): cache-first index.html with safe fallbacks
  if (isHTML(req)) {
    event.respondWith((async () => {
      const core = await caches.open(CACHE_CORE);

      // Try cached shell first
      const cached = await core.match('/index.html', { ignoreSearch: true });
      if (cached) {
        // refresh index in background (best effort)
        event.waitUntil(updateIndex(core));
        return cached;
      }

      // Use navigation preload if available; fallback to network
      try {
        const preload = await event.preloadResponse;
        const res = preload || await fetch(req);
        if (res && res.ok) core.put('/index.html', res.clone());
        return res;
      } catch {
        // Minimal offline page
        return offlineFallback();
      }
    })());
    return;
  }

  // 2) Static assets (CSS/JS/Icons/Posters): cache-first (SW-R for images)
  if (isSameOrigin(url) && isStaticAsset(req)) {
    // Images/Posters/Icons → stale-while-revalidate in STATIC cache
    if (req.destination === 'image') {
      event.respondWith(staleWhileRevalidate(req, CACHE_STATIC));
      return;
    }
    // CSS/JS/Fonts → cache-first from CORE (if present), otherwise STATIC
    event.respondWith((async () => {
      const core = await caches.open(CACHE_CORE);
      const matchCore = await core.match(req, { ignoreSearch: true });
      if (matchCore) return matchCore;

      const staticCache = await caches.open(CACHE_STATIC);
      const matchStatic = await staticCache.match(req, { ignoreSearch: true });
      if (matchStatic) return matchStatic;

      try {
        const res = await fetch(req);
        if (res && res.ok) {
          // Put in STATIC unless it’s one of our known CORE paths
          if (!CORE.some(p => url.pathname === p || url.pathname === p.split('?')[0])) {
            staticCache.put(req, res.clone());
          } else {
            core.put(req, res.clone());
          }
        }
        return res;
      } catch {
        // Try best-effort fallback by stripping query
        const fallback = await staticCache.match(url.pathname, { ignoreSearch: true }) ||
                         await core.match(url.pathname, { ignoreSearch: true });
        if (fallback) return fallback;
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })());
    return;
  }

  // 3) Media (audio/video): network-first (don’t cache partials)
  if (isMedia(req)) {
    event.respondWith((async () => {
      try {
        return await fetch(req, { cache: 'no-store' });
      } catch {
        // If offline and previously cached (rare), allow fallback
        const cache = await caches.open(CACHE_STATIC);
        const cached = await cache.match(req, { ignoreSearch: true });
        return cached || new Response(null, { status: 504, statusText: 'Offline' });
      }
    })());
    return;
  }

  // 4) JSON/API/other: network-first with fallback to cache
  if (isJSONorAPI(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_STATIC);
      try {
        const res = await fetch(req, { cache: 'no-store' });
        // Cache only OK, non-opaque GETs
        if (res && res.ok && res.type !== 'opaqueredirect') {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const cached = await cache.match(req, { ignoreSearch: true });
        return cached || new Response(null, { status: 504, statusText: 'Offline' });
      }
    })());
    return;
  }

  // Default: pass-through
  // (e.g., cross-origin analytics, 3P APIs handled by the network)
});

/// ===== Helpers =====
async function updateIndex(coreCache) {
  try {
    const fresh = await fetch('/index.html', { cache: 'no-store' });
    if (fresh && fresh.ok) {
      await coreCache.put('/index.html', fresh.clone());
      // Signal pages that a new version is staged (waiting)
      // The page’s updatePrompt.js will also detect a waiting SW automatically.
      await broadcast({ type: 'NEW_VERSION', version: VERSION });
    }
  } catch {
    // Ignore network errors
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req, { ignoreSearch: true });
  const fetchPromise = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || fetchPromise || new Response(null, { status: 504, statusText: 'Offline' });
}

function offlineFallback() {
  const html = `
    <!doctype html>
    <meta charset="utf-8">
    <title>Offline · Whylee</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{margin:0;padding:24px;background:#0b1220;color:#e6eef8;font:16px system-ui}
      .box{max-width:560px;margin:10vh auto;background:#0f1a2e;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px}
      h1{margin:0 0 6px 0;font-size:20px}
      p{color:#9fb3c8}
      a{color:#47b0ff;text-decoration:none}
    </style>
    <div class="box">
      <h1>Offline</h1>
      <p>Whylee couldn’t reach the network. Retry once you’re connected.</p>
    </div>
  `;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function broadcast(msg) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) c.postMessage(msg);
  } catch { /* no-op */ }
}
