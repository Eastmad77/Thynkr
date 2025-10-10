/* Whylee SW — robust caching with safe navigation preload handling */

const VERSION = '6006';                 // ⬅️ bumped
const CACHE = `whylee-cache-v${VERSION}`;
const CORE = [
  '/',
  '/index.html',
  '/style.css?v=6006',
  '/app.js?v=6006',
  '/shell.js?v=6006',
  '/media/icons/whylee-icon-192.png',
  '/media/icons/whylee-icon-512.png',
  '/media/icons/favicon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
  })());
  self.clients.claim();
});

const isHTML = req => req.mode === 'navigate' || (req.destination === 'document');
const isCore = url => CORE.some(path => url.endsWith(path.replace(/^\//, '')));
const isRange = req => req.headers.has('range');

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (isRange(req)) return;

  if (isHTML(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match('/index.html', { ignoreSearch: true });
      if (cached) {
        event.waitUntil((async () => {
          try {
            const fresh = await fetch('/index.html', { cache: 'no-store' });
            if (fresh && fresh.ok) await cache.put('/index.html', fresh.clone());
          } catch {}
        })());
        return cached;
      }
      try {
        const preload = await event.preloadResponse;
        const res = preload || await fetch(req);
        if (res && res.ok) cache.put('/index.html', res.clone());
        return res;
      } catch {
        return new Response(
          '<!doctype html><title>Offline</title><style>body{background:#0b1220;color:#e6eef8;font:16px system-ui;margin:0;padding:24px}</style><h1>Offline</h1><p>Whylee is offline. Try again once you\'re connected.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const url = new URL(req.url);
    const cache = await caches.open(CACHE);
    const isSameOrigin = url.origin === location.origin;
    const isMedia = ['video','audio'].includes(req.destination);

    if (isSameOrigin && (isCore(url.pathname) || ['style','script','image'].includes(req.destination))) {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok && res.status === 200 && res.type !== 'opaqueredirect') {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        const fallback = await cache.match(req.url.split('?')[0]);
        if (fallback) return fallback;
        throw err;
      }
    } else {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        return res;
      } catch {
        const cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;
        if (isMedia) return new Response(null, { status: 504, statusText: 'Offline' });
        throw err;
      }
    }
  })());
});
