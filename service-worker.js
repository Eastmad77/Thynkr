/* service-worker.js */
const CACHE = 'whylee-v1';
const ASSETS = [
  '/', '/index.html',
  '/styles/brand.css', '/styles/style.css', '/styles/animations.css'
];

// Install: warm basic shell
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for HTML, cache-first for same-origin assets
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Ignore source maps and opaque Firebase CDN *.map files
  if (url.pathname.endsWith('.map')) return;

  // Only manage same-origin requests
  if (url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Try cache, then network
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
