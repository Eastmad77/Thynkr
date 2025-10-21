// /service-worker.js
const CACHE_NAME = "whylee-app-v9";
const AVOID_HOSTS = [
  "www.gstatic.com",
  "www.googleapis.com",
  "firestore.googleapis.com",
  "firebaseinstallations.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "storage.googleapis.com",
  "js.stripe.com",
  "www.google-analytics.com"
];

// Install (optional precache kept minimal)
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Network strategy: bypass external CDNs; cache-first for own assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== "GET") return;

  // Bypass Firebase/Stripe/GA CDNs to avoid CSP violations and opaque caching
  if (AVOID_HOSTS.includes(url.hostname)) {
    return; // let the request go to network untouched
  }

  // Cache-first for same-origin assets
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const resp = await fetch(event.request);
        // Only cache basic, same-origin GETs
        if (resp && resp.status === 200 && resp.type === "basic") {
          cache.put(event.request, resp.clone());
        }
        return resp;
      } catch (_) {
        // Optionally return a fallback page/asset here
        return new Response("", { status: 504 });
      }
    })());
  }
});
