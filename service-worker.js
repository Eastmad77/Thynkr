/* Whylee service worker – static cache + runtime fallback (v7001) */

const CACHE_NAME = 'wl-v7001';
const CORE_ASSETS = [
  '/', '/index.html',
  '/style.css', '/styles/animations.css', '/styles/brand.css',
  '/shell.js', '/app.js', '/scripts/ui/updatePrompt.js',
  '/media/branding/logo-w-mark.png',
  '/media/branding/feature-graphic-1024x500.png',
  '/media/icons/whylee-icon-192.png',
  '/media/icons/whylee-icon-512.png',
  '/media/icons/favicon-32.png', '/media/icons/favicon-48.png', '/media/icons/favicon-96.png',
  '/media/ui/brand-fox-head.png',
  '/media/posters/v1/poster-01-start.jpg',
  '/media/posters/v1/poster-02-mode.jpg',
  '/media/posters/v1/poster-03-reward.jpg',
  '/media/posters/v1/poster-04-reflection.jpg',
  '/media/posters/v1/poster-05-upgrade.jpg',
  '/media/posters/v1/poster-06-challenge.jpg',
  '/media/posters/v1/poster-07-pro.jpg',
  '/media/posters/v1/poster-08-levelup.jpg',
  '/media/posters/v1/poster-09-community.jpg',
  '/media/posters/v1/poster-10-brand.jpg',
  '/media/posters/v1/countdown.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  // Only GET/HTTP(S)
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          // Runtime cache copy (basic)
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached || caches.match('/index.html'));
      return cached || fetchPromise;
    })
  );
});

/* SW update broadcast (used by /scripts/ui/updatePrompt.js) */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
