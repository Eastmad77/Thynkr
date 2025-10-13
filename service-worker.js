/* ============================================================================
   Whylee — Service Worker v7000
   ---------------------------------------------------------------------------
   - Versioned caches, simple & predictable
   - Safe navigation preload (HTML)
   - Cache-first for same-origin CSS/JS/Images/Icons/Manifest
   - Network-first for JSON/API
   - Skips Range requests (video/audio streaming)
   - Broadcasts `SW_UPDATED` on activate so UI can prompt users to refresh
   - Listens for `SKIP_WAITING` message to activate immediately
   ========================================================================== */

const VERSION = '7000';
const CACHE_NAME = `whylee-v${VERSION}`;

const CORE = [
  '/',                           // SPA entry
  '/index.html',
  '/style.css?v=7000',
  '/styles/animations.css?v=7000',
  '/shell.js?v=7000',
  '/app.js?v=7000',

  // Core images / icons
  '/media/icons/whylee-icon-192.png',
  '/media/icons/whylee-icon-512.png',
  '/media/icons/maskable-icon.png',
  '/media/icons/favicon.svg',

  // Manifest
  '/site.webmanifest?v=7000',

  // Optional: posters commonly used on home/splash
  '/media/posters/poster-start.jpg',
  '/media/posters/poster-success.jpg',
];

// Helpers --------------------------------------------------------------------
const isHTML = (req) =>
  req.mode === 'navigate' ||
  (req.destination === 'document') ||
  (req.headers.get('accept') || '').includes('text/html');

const isRange = (req) => req.headers.has('range');

const sameOrigin = (url) => url.origin === self.location.origin;

const wantsStaticCache = (req, url) =>
  sameOrigin(url) && (
    req.destination === 'style' ||
    req.destination === 'script' ||
    req.destination === 'image' ||
    req.destination === 'font'  ||
    url.pathname === '/site.webmanifest'
  );

const wantsNetworkFirst = (req, url) =>
  req.destination === 'document' ? false : (
    req.destination === 'video' ||
    req.destination === 'audio' ||
    /\/api\/|\.json($|\?)/i.test(url.pathname + url.search)
  );

// Broadcast helpers ----------------------------------------------------------
let bc;
try { bc = new BroadcastChannel('whylee-sw'); } catch (_) { bc = null; }

async function broadcastAll(type, payload = {}) {
  // 1) BroadcastChannel when available
  if (bc) { bc.postMessage({ type, payload }); return; }

  // 2) Fallback to client postMessage
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(c => c.postMessage({ type, payload }));
}

// Install --------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE);
  })());
  // Move SW to waiting; we'll decide activation strategy below
  self.skipWaiting();
});

// Activate -------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean up older versions
    const names = await caches.keys();
    await Promise.all(names.map(n => (n === CACHE_NAME ? null : caches.delete(n))));

    // Enable navigation preload (best-effort)
    try {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
    } catch {}

    // Claim clients so updated SW controls all open tabs immediately
    await self.clients.claim();

    // Let the app know a new version is active
    await broadcastAll('SW_UPDATED', { version: VERSION, at: Date.now() });
  })());
});

// Fetch ----------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  // Skip Range requests (let browser handle partials/streams)
  if (isRange(req)) return;

  // HTML navigations: app-shell strategy with preload
  if (isHTML(req)) {
    event.respondWith(handleHTML(event));
    return;
  }

  const url = new URL(req.url);

  // Static assets: cache-first
  if (wantsStaticCache(req, url)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // JSON/API or media: network-first with cache fallback
  if (wantsNetworkFirst(req, url)) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Default: try cache-first to keep things speedy
  event.respondWith(cacheFirst(req));
});

async function handleHTML(event) {
  const cache = await caches.open(CACHE_NAME);

  // Try cached index.html for SPA shell
  const cached = await cache.match('/index.html', { ignoreSearch: true });
  if (cached) {
    // Kick a background update of index.html (best-effort)
    event.waitUntil(refreshIndex(cache));
    return cached;
  }

  // No cached shell yet: use preload or network, then cache
  try {
    const preload = await event.preloadResponse;
    const res = preload || await fetch(event.request);
    if (res && res.ok) {
      cache.put('/index.html', res.clone());
    }
    return res;
  } catch {
    // Minimal offline fallback
    return offlineHTML();
  }
}

async function refreshIndex(cache) {
  try {
    const res = await fetch('/index.html', { cache: 'no-store' });
    if (res && res.ok) {
      await cache.put('/index.html', res.clone());
      await broadcastAll('SW_SHELL_REFRESHED', { at: Date.now() });
    }
  } catch {}
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const res = await fetch(req);
    // Don’t cache opaque redirects or non-OK
    if (res && res.ok && res.type !== 'opaqueredirect') {
      // Avoid caching partial 206
      if (res.status !== 206) {
        cache.put(req, res.clone());
      }
    }
    return res;
  } catch (err) {
    // Try cache without query as a last-resort
    const stripped = await cache.match(stripQuery(req), { ignoreSearch: true });
    if (stripped) return stripped;

    // Media offline? return 504 rather than HTML
    if (req.destination === 'video' || req.destination === 'audio') {
      return new Response(null, { status: 504, statusText: 'Offline' });
    }
    // Otherwise a tiny HTML fallback
    return offlineHTML();
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req, { cache: 'no-store' });
    if (res && res.ok && res.status !== 206 && res.type !== 'opaqueredirect') {
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await cache.match(req, { ignoreSearch: true }) ||
                   await cache.match(stripQuery(req), { ignoreSearch: true });
    if (cached) return cached;

    // Media offline? 504 is clearer than HTML
    if (req.destination === 'video' || req.destination === 'audio') {
      return new Response(null, { status: 504, statusText: 'Offline' });
    }
    return offlineHTML();
  }
}

function stripQuery(req) {
  const url = new URL(req.url);
  url.search = '';
  return new Request(url.toString(), { headers: req.headers, method: 'GET' });
}

function offlineHTML() {
  const html = `
<!doctype html>
<title>Offline · Whylee</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body{background:#0b1220;color:#e6eef8;font:16px system-ui;margin:0;display:grid;place-items:center;height:100vh;padding:24px}
  .box{max-width:560px;text-align:center}
  .box h1{margin:0 0 8px;font-size:22px}
  .box p{color:#9fb3c8;margin:0}
</style>
<div class="box">
  <h1>Offline</h1>
  <p>Whylee can’t reach the network. Please retry when you’re online.</p>
</div>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// Messages from client --------------------------------------------------------
self.addEventListener('message', (event) => {
  const { type } = event.data || {};
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
