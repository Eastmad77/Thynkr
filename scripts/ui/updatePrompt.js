/**
 * ============================================================================
 * Whylee — /scripts/ui/updatePrompt.js (v7000)
 * ----------------------------------------------------------------------------
 * Shows a small toast when a new SW is active. Lets the user refresh now or later.
 * Works with:
 *   - BroadcastChannel('whylee-sw') message { type: 'SW_UPDATED', payload: { version } }
 *   - clients.postMessage fallback (handled in this script as well)
 *   - 'SKIP_WAITING' message (to activate waiting worker directly if needed)
 * ============================================================================
 */

(function () {
  const el = document.getElementById('updatePrompt');
  const btnNow = document.getElementById('btnUpdateNow');
  const btnLater = document.getElementById('btnUpdateLater');

  if (!el || !btnNow || !btnLater) return;

  let dismissedForSession = false;

  function showToast() {
    if (dismissedForSession) return;
    el.style.display = 'block';
    el.classList.add('wl-toast-enter');
  }

  function hideToast() {
    el.style.display = 'none';
  }

  // Handle buttons
  btnNow.addEventListener('click', async () => {
    try {
      // Ask the waiting SW (if any) to skip waiting, then reload
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) {
        // Prefer direct call if page has reference
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // Or try via controller (active) — SW v7000 also listens for SKIP_WAITING
        navigator.serviceWorker.controller?.postMessage?.({ type: 'SKIP_WAITING' });
      }
    } catch {}
    // Small delay to allow activation, then hard reload
    setTimeout(() => location.reload(), 150);
  });

  btnLater.addEventListener('click', () => {
    dismissedForSession = true;
    hideToast();
  });

  // Listen via BroadcastChannel (preferred)
  try {
    const bc = new BroadcastChannel('whylee-sw');
    bc.addEventListener('message', (e) => {
      if (!e?.data) return;
      const { type } = e.data;
      if (type === 'SW_UPDATED' || type === 'SW_SHELL_REFRESHED') {
        showToast();
      }
    });
  } catch {
    // Fallback: listen to general messages from the controller
    navigator.serviceWorker?.addEventListener?.('message', (event) => {
      const { type } = event.data || {};
      if (type === 'SW_UPDATED' || type === 'SW_SHELL_REFRESHED') {
        showToast();
      }
    });
  }

  // Optional: also show if we detect a new waiting worker immediately after page load
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.waiting) showToast();
    } catch {}
  });
})();
