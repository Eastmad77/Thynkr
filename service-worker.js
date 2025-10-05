/* =======================================================
   Thynkr Service Worker — Premium (v3)
   - Precache essentials (CSS/JS/icons/posters/manifests)
   - Runtime caching for pages, images, videos
   - No pre-cache for large videos (cached after first play)
   ======================================================= */

const CACHE_VERSION = 'thynkr-v3';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const PAGES_CACHE   = `${CACHE_VERSION}-pages`;
const IMAGE_CACHE   = `${CACHE_VERSION}-images`;
const VIDEO_CACHE   = `${CACHE_VERSION}-videos`;
const OTHER_CACHE   = `${CACHE_VERSION}-other`;

/* Keep this list lean: fast to install, safe to update */
const PRECACHE_URLS = [
  '/',                     // SPA entry
  '/index.html',
  '/style.css',
  '/app.js',
  '/shell.js',
  '/site.webmanifest',
  '/favicon.svg',

  // Posters & Icons (lightweight, instant splash UX)
  '/media/poster-start.jpg',
  '/media/poster-success.jpg',
  '/media/thynkr-icon-192.png',
  '/media/thynkr-icon-512.png'
];

/* ---------- Install: precache essentials ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* ---------- Activate: cleanup old versions ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [STATIC_CACHE, PAGES_CACHE, IMAGE_CACHE, VIDEO_CACHE, OTHER_CACHE];
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => { if (!keep.includes(key)) return caches.delete(key); }));
    await self.clients.claim();
  })());
});

/* ---------- Fetch strategy router ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only GET requests are cacheable
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) HTML navigations: Network-first (offline fallback to cache)
  if (req.mode === 'navigate' || (req.destination === 'document')) {
    event.respondWith(networkFirst(req, PAGES_CACHE));
    return;
  }

  // 2) CSS/JS/Manifest: Stale-while-revalidate for snappy loads
  if (req.destination === 'style' || req.destination === 'script' || req.destination === 'manifest') {
    event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
    return;
  }

  // 3) Images (incl. posters/icons): Cache-first (then revalidate)
  if (req.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
    return;
  }

  // 4) Videos (MP4/WebM): Cache-first after first network fetch, but NOT pre-cached
  if (req.destination === 'video' || /\.(mp4|webm)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req, VIDEO_CACHE));
    return;
  }

  // 5) Default: Stale-while-revalidate
  event.respondWith(staleWhileRevalidate(req, OTHER_CACHE));
});

/* ---------- Strategies ---------- */

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(stripSearch(request));
    if (cached) return cached;
    // Minimal offline fallback HTML
    return new Response(
      `<!doctype html><meta charset="utf-8"><title>Offline — Thynkr</title>
       <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#081a2d;color:#fff;padding:2rem;text-align:center}</style>
       <h1>Offline</h1><p>You’re offline. Please reconnect and try again.</p>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(stripSearch(request));
  if (cached) {
    // Revalidate in background (best effort)
    fetch(request).then((res) => { if (res && res.ok) cache.put(request, res.clone()); }).catch(()=>{});
    return cached;
  }
  try {
    const fresh = await fetch(request, { credentials: 'same-origin' });
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    // As a last resort, fall back to any cached root
    const fallback = await caches.match('/');
    return fallback || new Response('', { status: 504 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(stripSearch(request));
  const fetchPromise = fetch(request).then((res) => {
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => undefined);

  return cached || fetchPromise || fetch(request).catch(() => new Response('', { status: 504 }));
}

/* ---------- Helpers ---------- */

// Treat /style.css?v=123 same as /style.css for cache lookup
function stripSearch(request) {
  try {
    const url = new URL(request.url);
    url.search = '';
    return new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      mode: request.mode,
      credentials: request.credentials,
      redirect: request.redirect,
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      integrity: request.integrity,
      cache: request.cache
    });
  } catch {
    return request;
  }
}
