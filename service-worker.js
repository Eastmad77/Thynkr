/* Whylee SW v6003 — cache-first shell + cautious media handling */
const VERSION = '6003';
const CACHE = `whylee-cache-v${VERSION}`;
const CORE = [
  '/', '/index.html',
  '/style.css?v=6003', '/app.js?v=6003', '/shell.js?v=6003',
  // Posters (static only; video is network-first)
  '/media/posters/poster-start.jpg',
  '/media/posters/poster-menu.jpg',
  '/media/posters/poster-quiz.jpg',
  '/media/posters/poster-countdown.jpg',
  '/media/posters/poster-success.jpg',
  '/media/posters/poster-gameover.jpg',
  '/media/posters/poster-level2.jpg',
  '/media/posters/poster-level3.jpg',
  '/media/posters/poster-tomorrow.jpg',
  '/media/posters/poster-stats.jpg',
  '/media/posters/poster-profile.jpg',
  // Icons
  '/media/icons/whylee-icon-192.png',
  '/media/icons/whylee-icon-512.png',
  '/media/icons/whylee-fox.svg'
];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)));
  self.skipWaiting();
});
self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    if (self.registration.navigationPreload) { try{ await self.registration.navigationPreload.enable(); }catch{} }
  })());
  self.clients.claim();
});

const isHTML = req => req.mode === 'navigate' || req.destination === 'document';
const isRange = req => req.headers.has('range');

self.addEventListener('fetch', e=>{
  const req = e.request;
  if (req.method !== 'GET') return;
  if (isRange(req)) return; // let browser handle partial content

  if (isHTML(req)){
    e.respondWith((async()=>{
      const cache = await caches.open(CACHE);
      const cached = await cache.match('/index.html', {ignoreSearch:true});
      if (cached){
        e.waitUntil((async()=>{ try{ const fresh=await fetch('/index.html',{cache:'no-store'}); if (fresh.ok) await cache.put('/index.html', fresh.clone()); }catch{} })());
        return cached;
      }
      try{
        const preload = await e.preloadResponse; const res = preload || await fetch(req);
        if (res && res.ok) cache.put('/index.html', res.clone());
        return res;
      }catch{
        return new Response('<!doctype html><title>Offline</title><meta charset=utf-8><style>body{background:#08142c;color:#e9f2ff;font:16px system-ui;margin:0;padding:24px}</style><h1>Offline</h1><p>Whylee is offline. Try again later.</p>', {headers:{'Content-Type':'text/html; charset=utf-8'}});
      }
    })());
    return;
  }

  // Media/video network-first; static assets cache-first
  const url = new URL(req.url);
  const media = ['video','audio'].includes(req.destination);
  e.respondWith((async()=>{
    const cache = await caches.open(CACHE);
    if (!media){
      const cached = await cache.match(req, {ignoreSearch:true});
      if (cached) return cached;
      try{
        const res = await fetch(req);
        if (res && res.ok && res.status === 200) cache.put(req, res.clone());
        return res;
      }catch(err){
        const fallback = await cache.match(req.url.split('?')[0]);
        if (fallback) return fallback;
        throw err;
      }
    } else {
      try{ return await fetch(req, {cache:'no-store'}); }
      catch{ const cached = await cache.match(req, {ignoreSearch:true}); if (cached) return cached; return new Response(null,{status:504,statusText:'Offline'}); }
    }
  })());
});
