// ============================================================================
// ui/updatePrompt.js — “New version available” toast
// ----------------------------------------------------------------------------
// Listens for Service Worker messages and presents a small toast prompting the
// user to reload. Also detects an already-waiting SW on page load.
// Requires: /styles/animations.css (for #update-toast styles).
// ============================================================================

/**
 * Inject and return the toast element.
 */
function createToast() {
  let toast = document.getElementById('update-toast');
  if (toast) return toast;

  toast = document.createElement('div');
  toast.id = 'update-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <div class="toast-inner">
      <span>New version available</span>
      <button id="refresh-btn" type="button" aria-label="Update now">Update</button>
    </div>
  `;
  document.body.appendChild(toast);
  return toast;
}

/**
 * Trigger the update flow: ask the waiting SW to activate, then reload.
 */
async function performUpdate() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Reload after controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Small delay to ensure new assets are controlled by the new SW
        setTimeout(() => location.reload(), 200);
      });
    } else {
      // No waiting worker found; fallback to simple reload
      location.reload();
    }
  } catch (err) {
    console.error('[Whylee] Update flow error:', err);
    location.reload();
  }
}

/**
 * Show the toast UI and wire events.
 */
function showToast() {
  const toast = createToast();
  const btn = toast.querySelector('#refresh-btn');
  btn?.addEventListener('click', () => {
    toast.classList.add('fade-out');
    setTimeout(performUpdate, 180);
  }, { once: true });
}

/**
 * Check if there is already a waiting SW when the page loads.
 * (e.g., SW was updated while tab was in background.)
 */
async function checkWaitingWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) showToast();
  } catch (err) {
    // non-fatal
  }
}

/**
 * Public API: registers listeners and initial check.
 */
export function registerUpdatePrompt() {
  // 1) SW broadcast: NEW_VERSION → show toast
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (evt) => {
      if (evt?.data?.type === 'NEW_VERSION') {
        showToast();
      }
    });
  }

  // 2) On load: detect already-waiting worker
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    checkWaitingWorker();
  } else {
    window.addEventListener('DOMContentLoaded', checkWaitingWorker, { once: true });
  }
}

// Optional helpers if you want to trigger manually from DevTools:
export function showUpdatePromptManually() { showToast(); }
export async function forceUpdateNow() { await performUpdate(); }
