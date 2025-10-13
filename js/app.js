/**
 * Whylee app.js (v7000)
 * - Registers Service Worker (allowed on localhost + HTTPS)
 * - Enables navigation preload when available
 * - Basic online/offline indicators
 */

(() => {
  console.log('[Whylee] v7000 — app booted');

  // Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js?v=7000', { scope: '/' });
        if ('navigationPreload' in reg) {
          try { await reg.navigationPreload.enable(); } catch {}
        }
        console.log('[Whylee] SW registered', reg.scope);
      } catch (err) {
        console.error('[Whylee] SW registration failed', err);
      }
    });
  }

  // Simple online/offline UX hooks (optional UI integration)
  const html = document.documentElement;
  const setNet = () => {
    html.dataset.online = navigator.onLine ? '1' : '0';
  };
  addEventListener('online', setNet);
  addEventListener('offline', setNet);
  setNet();
})();
