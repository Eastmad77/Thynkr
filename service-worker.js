/* Whylee SW v7006 */
const CACHE = 'whylee-v7006';
const ASSETS = [
  '/', '/index.html',
  '/css/style.css?v=7006',
  '/css/animations.css?v=7006',
  '/styles/avatar.css?v=7006',
  '/styles/avatar-badge.css?v=7006',
  '/js/app.js?v=7006',
  '/js/shell.js?v=7006',
  '/media/icons/whylee-icon-192.png',
  '/media/icons/whylee-icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache functions
  if (url.pathname.startsWith('/.netlify/functions/')) return;

  // HTML: network falling back to cache
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request, { ignoreSearch: false }).then(cached => {
        return cached || fetch(request).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
          return resp;
        });
      })
    );
  }
});
