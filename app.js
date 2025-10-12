/* =========================================================
   Whylee v7 — App Boot
   - SW registration + update prompt hook
   - PWA install prompt
   ========================================================= */
(() => {
  const VERSION = '7000';
  console.log(`[Whylee] v${VERSION} — app booted`);

  // Expose version (optional)
  window.WHYLEE_BUILD = VERSION;

  // ---------------- Service Worker ----------------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js?v=' + VERSION, { scope: '/' });

        // Enable navigation preload when supported
        if ('navigationPreload' in reg) {
          try { await reg.navigationPreload.enable(); } catch {}
        }

        // Listen for SW "updated" broadcast to show refresh toast
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event?.data === 'SW_UPDATED') {
            window.WhyleeUpdatePrompt?.show({
              message: 'A new version of Whylee is ready.',
              action: 'Refresh',
              onAction: () => location.reload()
            });
          }
        });

        console.log('[Whylee] SW registered', reg.scope);
      } catch (err) {
        console.error('[Whylee] SW registration failed', err);
      }
    });
  }

  // ---------------- PWA Install ----------------
  let deferredPrompt = null;
  const installBtn = document.querySelector('#btn-install');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });
  installBtn?.addEventListener('click', async () => {
    installBtn.disabled = true;
    if (!deferredPrompt) return;
    const { outcome } = await deferredPrompt.prompt();
    if (outcome !== 'accepted') installBtn.disabled = false;
    deferredPrompt = null; installBtn.hidden = true;
  });

  // ---------------- Simple global event bus ----------------
  window.Whylee = Object.assign(window.Whylee || {}, {
    emit(name, detail) { document.dispatchEvent(new CustomEvent(name, { detail })); },
    on(name, fn) { document.addEventListener(name, (e) => fn(e.detail)); }
  });

})();
