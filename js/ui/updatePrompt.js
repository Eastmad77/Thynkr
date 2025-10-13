/**
 * ============================================================================
 * Whylee — UI / updatePrompt (v7000)
 * ----------------------------------------------------------------------------
 * Detects when a new Service Worker is waiting and nudges the user to refresh.
 * Works with the v7000 SW, which broadcasts { type: 'NEW_VERSION' }.
 *
 * Usage: imported once in index.html via:
 *   <script type="module">import '/js/ui/updatePrompt.js'</script>
 * ============================================================================ */

const TOAST_ID = 'update-toast';
const BTN_ACCEPT = 'btn-update-accept';
const BTN_DISMISS = 'btn-update-dismiss';

const log = (...args) => console.log('[Whylee:update]', ...args);

/** Get elements eagerly if they exist on the page */
function els() {
  return {
    toast: document.getElementById(TOAST_ID),
    accept: document.getElementById(BTN_ACCEPT),
    dismiss: document.getElementById(BTN_DISMISS),
  };
}

/** Show the update toast UI */
function showToast() {
  const { toast } = els();
  if (!toast) return;
  toast.hidden = false;
}

/** Hide the update toast UI */
function hideToast() {
  const { toast } = els();
  if (!toast) return;
  toast.hidden = true;
}

/** Ask a waiting SW to activate immediately, then reload */
async function acceptAndReload() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      // When the controller changes, we’re on the new version.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // slight delay avoids rare race conditions with cache swap
        setTimeout(() => location.reload(), 100);
      });
      return;
    }
    // Fallback if no waiting worker (rare)
    location.reload();
  } catch {
    location.reload();
  }
}

/** Wire the buttons (if present) */
function wireButtons() {
  const { accept, dismiss } = els();
  accept?.addEventListener('click', acceptAndReload);
  dismiss?.addEventListener('click', hideToast);
}

/** Inspect current SW registration to see if an update is ready */
async function checkRegistrationForUpdate() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    // If a waiting worker already exists, show the prompt.
    if (reg.waiting) {
      log('New version waiting; prompting user.');
      showToast();
    }

    // When a new worker installs and becomes "waiting", prompt.
    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          log('Installed new SW; prompting user.');
          showToast();
        }
      });
    });
  } catch (e) {
    // Non-fatal; we just skip prompting
    log('checkRegistrationForUpdate error:', e);
  }
}

/** Listen for SW messages (v7000 SW sends { type: 'NEW_VERSION' }) */
function listenForBroadcasts() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e?.data?.type === 'NEW_VERSION') {
      log('Broadcast NEW_VERSION received.');
      showToast();
    }
  });
}

/** Boot */
(function init() {
  wireButtons();
  listenForBroadcasts();
  checkRegistrationForUpdate();
})();
