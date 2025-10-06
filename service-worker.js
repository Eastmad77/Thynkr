/* Thynkr SW — v9030: safe caching (no partials), no nav preload noise */

const CACHE_NAME = 'thynkr-static-v9030';
const ASSETS = [
  '/', '/index.html',
  '/style.css', '/app.js',
  '/media/favicon.svg',
  '/media/avatars/thynkr-fox-core.png',
  '/media/avatars/thynkr-fox-focused.png',
  '/media/avatars/thynkr-fox-curious.png',
  '/media/avatars/thynkr-fox-genius.png',
  '/media/avatars/thynkr-fox-playful.png',
  '/media/avatars/thynkr-fox-night.png',
  '/media/avatars/thynkr-fox-relaxed.png',
  '/media/avatars/thynkr-fox-gameover.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(ASSETS); } catch(e) { /* ignore missing */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Disable navigation preload to avoid preloadResponse warnings
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.disable(); } catch(e){}
    }
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)));
    self.clients.claim();
  })());
});

function isMedia(req) {
  return ['video','audio'].some(t => req.destination === t) ||
         /\.(mp4|webm|mp3|wav|ogg)$/i.test(new URL(req.url).pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Don’t touch range requests (prevents 206 caching errors)
  if (req.headers.has('range') || isMedia(req)) return;

  // Only handle GET
  if (req.method !== 'GET') return;

  event.respondWith((async () => {
    // Try cache first
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const netRes = await fetch(req);
      // Only cache safe responses
      const okToCache =
        netRes &&
        netRes.status === 200 &&
        !netRes.headers.get('Content-Range') &&
        !req.headers.get('range');

      if (okToCache) {
        const cache = await caches.open(CACHE_NAME);
        // Clone before storing
        cache.put(req, netRes.clone()).catch(()=>{});
      }
      return netRes;
    } catch (err) {
      // Offline fallback for root
      if (req.mode === 'navigate') {
        const cachedRoot = await caches.match('/index.html');
        if (cachedRoot) return cachedRoot;
      }
      throw err;
    }
  })());
});
