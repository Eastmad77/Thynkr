// Whylee App v6003 — register SW, preload posters, minor boot logs
(() => {
  console.log('[Whylee] v6003 — boot');

  // Preload key posters so screens switch instantly
  const POSTERS = [
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
    '/media/posters/poster-profile.jpg'
  ];
  POSTERS.forEach(src=>{ const i=new Image(); i.decoding='async'; i.src=src; });

  // Service Worker
  if ('serviceWorker' in navigator){
    addEventListener('load', async () => {
      try{
        const reg = await navigator.serviceWorker.register('/service-worker.js?v=6003', { scope:'/' });
        if ('navigationPreload' in reg) { try{ await reg.navigationPreload.enable(); }catch{} }
        console.log('[Whylee] SW registered', reg.scope);
      }catch(err){ console.error('[Whylee] SW registration failed', err); }
    });
  }
})();
