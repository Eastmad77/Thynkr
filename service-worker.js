/* service-worker.js — v9007 */
const VERSION = 'v9007';
const RUNTIME = `whylee-${VERSION}`;

// Precache only the minimal shell. We purposely do NOT precache JS/CSS so we never pin old versions.
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(RUNTIME).then((c) => c.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting(); // take over immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== RUNTIME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // control all pages now
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Ignore source maps
  if (url.pathname.endsWith('.map')) return;

  // HTML: network-first with cache fallback
  const isHTML = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');

  // JS/CSS: network-first so version bumps (v=9007) win immediately
  const isCode = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');

  // Images/media: cache-first
  const isMedia = url.pathname.startsWith('/media/');

  if (isHTML || isCode) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  if (isMedia) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(RUNTIME).then(c => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  // Default: try network, fall back to cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
