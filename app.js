(() => {
  console.log('[Whylee] v6006 — app booted');

  // Register the Service Worker (allowed on http://localhost and https)
  if ('serviceWorker' in navigator){
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js?v=6006', { scope: '/' });
        if ('navigationPreload' in reg) {
          try { await reg.navigationPreload.enable(); } catch {}
        }
        console.log('[Whylee] SW registered', reg.scope);
      } catch (err) {
        console.error('[Whylee] SW registration failed', err);
      }
    });
  }
})();
