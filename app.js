/* ===========================================================================
   Whylee — App Bootstrap v7000
   Initializes shell, registers service worker, handles install prompts,
   and manages update prompts + graceful reload.
   =========================================================================== */

console.log('[Whylee] v7000 — booting app');

const APP_VERSION = '7.0.0';
const swFile = '/service-worker.js?v=7000';
let deferredPrompt;

// -----------------------------
// Service Worker Registration
// -----------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register(swFile);
      console.log('[Whylee] SW registered:', reg.scope);

      // Listen for new version messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NEW_VERSION') {
          console.log('[Whylee] New version detected:', event.data.version);
          showUpdateToast();
        }
      });

    } catch (err) {
      console.error('[Whylee] SW registration failed:', err);
    }
  });
}

// -----------------------------
// Update Prompt (toast trigger)
// -----------------------------
function showUpdateToast() {
  const toast = document.createElement('div');
  toast.id = 'update-toast';
  toast.innerHTML = `
    <div class="toast-inner">
      <span>New version available</span>
      <button id="refresh-btn">Update</button>
    </div>
  `;
  document.body.appendChild(toast);

  document.getElementById('refresh-btn').addEventListener('click', async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      toast.classList.add('fade-out');
      setTimeout(() => location.reload(), 400);
    }
  });
}

// -----------------------------
// Install prompt (Add to Home)
// -----------------------------
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('btn-install');
  if (btn) btn.hidden = false;

  btn?.addEventListener('click', async () => {
    btn.hidden = true;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[Whylee] Install: ${outcome}`);
    deferredPrompt = null;
  });
});

// -----------------------------
// Refresh button for dev use
// -----------------------------
const refreshBtn = document.getElementById('btn-refresh');
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => location.reload());
}

// -----------------------------
// App startup splash animation
// -----------------------------
window.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    app.classList.add('fade-in');
    setTimeout(() => app.classList.remove('fade-in'), 1200);
  }

  const verEl = document.getElementById('app-version');
  if (verEl) verEl.textContent = `v${APP_VERSION}`;
});
