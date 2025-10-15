/* Whylee Service Worker (v7006) */
const CACHE_NAME = 'whylee-cache-v7006';

const CORE = [
  '/', '/index.html',
  '/menu.html', '/leaderboard.html', '/profile.html',
  '/about.html', '/privacy.html', '/terms.html', '/contact.html', '/pro.html',
  '/styles/brand.css?v=7005',
  '/styles/avatar.css?v=7005',
  '/styles/avatar-badge.css?v=7006',
  '/scripts/shell.js?v=7000',
  '/scripts/app.js?v=7000',
  '/scripts/ui/avatar.js?v=7006',
  '/data/leaderboard.json?v=7006',
  '/media/icons/whylee-icon-192.png',
  '/media/icons/whylee-icon-512.png',
  '/site.webmanifest'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Bypass for Netlify functions and Firestore endpoints
  if (url.pathname.startsWith('/.netlify/functions/')) return;

  // Network-first for JSON data; cache-first for static
  if (url.pathname.endsWith('.json')) {
    event.respondWith(networkThenCache(req));
  } else {
    event.respondWith(cacheThenNetwork(req));
  }
});

async function cacheThenNetwork(req) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;

  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return hit || new Response('Offline', { status: 503 });
  }
}

async function networkThenCache(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    return hit || new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
