/* Whylee SW v7000 — robust, safe caching with update broadcast
   - Navigation: cache-first app shell (index.html) + background refresh
   - Static assets: cache-first (scripts/styles/images) for same-origin
   - Media/Range: bypass (avoid caching partial streams)
   - SW updates: broadcasts `SW_UPDATED` via BroadcastChannel("sw-messages")
   - Client prompt: page can listen and show “New version available — Refresh”
*/

const VERSION = '7000';
const CACHE = `whylee-cache-v${VERSION}`;

// Core shell you want available offline immediately
const CORE = [
  '/',                         // SPA entry
  '/index.html',
  '/styles/style.css?v=7000',
  '/styles/animations.css?v=7000',

  // minimal boot chain; rest will be cached on-demand
  '/js/app.js?v=7000',
  '/js/shell.js?v=7000',
  '/js/config/gameRules.js?v=7000',
  '/js/state/entitlements.js?v=7000',
  '/js/ui/updatePrompt.js?v=7000',
  '/js/game/core.js?v=7000',
  '/js/billing/stripe.js?v=7000',
  '/js/billing/play.js?v=7000',

  // icons used by browser/UI
  '/media/icons/whylee-icon-192.png',
  '/media/icons/whylee-icon-512.png',
  '/media/icons/maskable-icon.png',
  '/media/icons/whylee-fox.svg'
];

// ---------- Helpers
const isHTML = req =>
  req.mode === 'navigate' ||
  req.destination === 'document' ||
  (req.headers.get('accept') || '').includes('text/html');

const isRange = req => req.headers.has('range');

const sameOrigin = url => url.origin === self.location.origin;

// ---------- Install: cache the shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE))
  );
  self.skipWaiting();
});

// ---------- Activate: clean old caches & enable navigation preload
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));

    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }

    // broadcast that a new SW is active
    try {
      const bc = new BroadcastChannel('sw-messages');
      bc.postMessage({ type: 'SW_UPDATED', version: VERSION });
      bc.close();
    } catch {}
  })());
  self.clients.claim();
});

// ---------- Fetch: navigation + static + dynamic
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only GET
  if (req.method !== 'GET') return;

  // Bypass range/streaming media (let network handle)
  if (isRange(req)) return;

  // Handle navigations (SPA)
  if (isHTML(req)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match('/index.html', { ignoreSearch: true });
      if (cached) {
        // background refresh of the shell
        event.waitUntil((async () => {
          try {
            const fresh = await fetch('/index.html', { cache: 'no-store' });
            if (fresh && fresh.ok) await cache.put('/index.html', fresh.clone());
          } catch {}
        })());
        return cached;
      }

      // First time: use navigation preload or network, then cache
      try {
        const preload = await event.preloadResponse;
        const res = preload || await fetch(req);
        if (res && res.ok) {
          await cache.put('/index.html', res.clone());
        }
        return res;
      } catch {
        // Minimal offline fallback
        return new Response(
          '<!doctype html><title>Offline</title><style>body{background:#0b1220;color:#e6eef8;font:16px system-ui;margin:0;padding:24px}</style><h1>Offline</h1><p>Whylee is offline. Try again when you’re connected.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // Static assets: cache-first for same-origin scripts/styles/images/fonts
  if (sameOrigin(new URL(req.url)) &&
     (['style','script','image','font'].includes(req.destination))) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const res = await fetch(req);
        if (res && res.ok && res.status === 200 && res.type !== 'opaqueredirect') {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        // Try best-effort fallback without query
        const fallback = await cache.match(req.url.split('?')[0], { ignoreSearch: true });
        if (fallback) return fallback;
        throw new Error('Network error and no cache available');
      }
    })());
    return;
  }

  // Everything else: network-first (e.g., JSON/API)
  event.respondWith((async () => {
    try {
      return await fetch(req, { cache: 'no-store' });
    } catch {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      return new Response(null, { status: 504, statusText: 'Offline' });
    }
  })());
});

// ---------- Client message -> skipWaiting (for update UX)
self.addEventListener('message', evt => {
  if (!evt.data) return;
  if (evt.data.type === 'SKIP_WAITING') self.skipWaiting();
});
