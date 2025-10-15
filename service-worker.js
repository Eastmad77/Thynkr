/* Whylee service worker – static cache + runtime fallback (v7002) */

const CACHE_NAME = 'wl-v7002';
const CORE_ASSETS = [
  '/', '/index.html',
  '/style.css', '/styles/animations.css', '/styles/brand.css',
  '/shell.js', '/app.js', '/scripts/ui/updatePrompt.js',
  '/scripts/posters.js', '/scripts/firebase-bridge.js',
  '/media/branding/logo-w-mark.png',
  '/media/branding/feature-graphic-1024x500.png',
  '/media/icons/whylee-icon-192.png',
  '/media/icons/whylee-icon-512.png',
  '/media/icons/favicon-32.png', '/media/icons/favicon-48.png', '/media/icons/favicon-96.png',
  '/media/ui/brand-fox-head.png',

  // Posters (full)
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
  '/media/posters/v1/countdown.png',

  // Thumbnails (fast LQIPs)
  '/media/thumbnails/poster-01-start-thumb.jpg',
  '/media/thumbnails/poster-02-mode-thumb.jpg',
  '/media/thumbnails/poster-03-reward-thumb.jpg',
  '/media/thumbnails/poster-04-reflection-thumb.jpg',
  '/media/thumbnails/poster-05-upgrade-thumb.jpg',
  '/media/thumbnails/poster-06-challenge-thumb.jpg',
  '/media/thumbnails/poster-07-pro-thumb.jpg',
  '/media/thumbnails/poster-08-levelup-thumb.jpg',
  '/media/thumbnails/poster-09-community-thumb.jpg',
  '/media/thumbnails/poster-10-brand-thumb.jpg',
  '/media/thumbnails/countdown-thumb.jpg',
  '/media/thumbnails/feature-thumb.jpg',
  '/media/thumbnails/logo-thumb.png'
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
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached || caches.match('/index.html'));
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
