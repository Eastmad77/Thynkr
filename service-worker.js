// service-worker.js — v7000
const CACHE_NAME = "whylee-v7000";
const CORE_ASSETS = [
  "/", "/index.html",
  "/manifest.json",
  "/site.webmanifest",
  "/styles/style.css",
  "/styles/animations.css",
  "/scripts/app.js",
  "/scripts/shell.js",
  "/scripts/core.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(r => {
      return r ||
        fetch(req)
          .then(resp => {
            if (req.url.startsWith(self.location.origin) && resp.ok) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then(c => c.put(req, clone));
            }
            return resp;
          })
          .catch(() => caches.match("/index.html"));
    })
  );
});

// Listen for skipWaiting trigger from updatePrompt.js
self.addEventListener("message", e => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
});
