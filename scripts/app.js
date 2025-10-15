// scripts/app.js  — v7000
(() => {
  const VERSION = '7000';

  // Stamp version in footer if present
  const vLabel = document.getElementById('app-version');
  if (vLabel) vLabel.textContent = `v${VERSION}`;

  // Online/offline body class
  function setNetClass() {
    document.body.classList.toggle('is-offline', !navigator.onLine);
  }
  window.addEventListener('online', setNetClass);
  window.addEventListener('offline', setNetClass);
  setNetClass();

  // Service Worker registration + update prompt
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js?v=' + VERSION, { scope: '/' })
      .catch(err => console.warn('[SW] register failed', err));

    // Update prompt (BroadcastChannel optional)
    const promptEl = document.getElementById('updatePrompt');
    const btnNow   = document.getElementById('btnUpdateNow');
    const btnLater = document.getElementById('btnUpdateLater');

    const showPrompt = () => promptEl && (promptEl.style.display = 'block');
    const hidePrompt = () => promptEl && (promptEl.style.display = 'none');

    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel('whylee-sw');
      ch.onmessage = (ev) => {
        if (ev?.data === 'NEW_VERSION') showPrompt();
      };
    }

    if (btnNow) {
      btnNow.addEventListener('click', async () => {
        hidePrompt();
        const regs = await navigator.serviceWorker.getRegistrations();
        regs.forEach(r => r.update());
        // Force reload to new cache
        location.reload();
      });
    }
    if (btnLater) btnLater.addEventListener('click', hidePrompt);
  }

  // Install prompt hook (if your installPrompt.js exposes window.WhyleeInstall)
  const btnInstall = document.getElementById('btn-install');
  if (btnInstall && window.WhyleeInstall) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window.WhyleeInstall.setEvent(e);
      btnInstall.hidden = false;
      btnInstall.addEventListener('click', () => window.WhyleeInstall.confirm());
    });
  }

  // Refresh button reloads app & SW
  const btnRefresh = document.getElementById('btn-refresh');
  if (btnRefresh) btnRefresh.addEventListener('click', () => location.reload());

  // Menu button reserved for future side-drawer (scripts/menu.js)
  const btnMenu = document.getElementById('btn-menu');
  if (btnMenu) btnMenu.addEventListener('click', () => document.body.classList.toggle('menu-open'));
})();
