/**
 * ============================================================================
 * Whylee — UI / updatePrompt (enhanced v7000)
 * ----------------------------------------------------------------------------
 * Add-ins:
 *  - Works even if the toast markup is missing (auto-creates)
 *  - Shows current vs incoming version when SW broadcasts it
 *  - Visibility + interval polling to reduce missed prompts
 *  - Persists lastVersionSeen to avoid noisy prompts
 *  - Safe controllerchange reload flow
 *
 * Expected SW messages (v7000):
 *   postMessage({ type: 'NEW_VERSION', version: '7001' })
 *
 * Markup (optional — created dynamically if absent):
 *   <div id="update-toast" hidden> ... buttons with ids:
 *     btn-update-dismiss, btn-update-accept
 *   </div>
 *
 * Version label on page (optional):
 *   <small id="app-version"></small>
 * ============================================================================
 */

const TOAST_ID = 'update-toast';
const BTN_ACCEPT = 'btn-update-accept';
const BTN_DISMISS = 'btn-update-dismiss';
const APP_VERSION_LABEL_ID = 'app-version';

const STORAGE_KEY_LAST_SEEN = 'whylee:lastVersionSeen';

// Polling config (lightweight)
const POLL_INTERVAL_MS = 90_000; // 90s
let POLL_HANDLE = null;

// State cache
let incomingVersion = null;

const log = (...a) => console.log('[Whylee:update]', ...a);
const warn = (...a) => console.warn('[Whylee:update]', ...a);

/* =========================
   DOM helpers / mounting
   ========================= */
function ensureToastDOM() {
  let toast = document.getElementById(TOAST_ID);
  if (toast) return toast;

  // Create minimal, on-brand toast if not present
  toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.hidden = true;
  toast.setAttribute('role', 'status');
  toast.style.cssText = [
    'position:fixed',
    'inset:auto 16px 16px 16px',
    'z-index:9999',
    'display:flex',
    'gap:12px',
    'align-items:center',
    'justify-content:space-between',
    'background:#0f1a2e',
    'border:1px solid rgba(255,255,255,.08)',
    'border-radius:14px',
    'padding:12px 14px',
    'box-shadow:0 10px 30px rgba(0,0,0,.25)',
  ].join(';');

  const left = document.createElement('div');
  const strong = document.createElement('strong'); strong.textContent = 'Update available';
  const sub = document.createElement('div'); sub.className = 'muted'; sub.textContent = 'Tap to refresh to the latest version.';
  left.appendChild(strong); left.appendChild(sub);

  const right = document.createElement('div');
  right.style.display = 'flex'; right.style.gap = '8px';

  const btnLater = document.createElement('button');
  btnLater.id = BTN_DISMISS; btnLater.className = 'secondary'; btnLater.textContent = 'Later';

  const btnUpdate = document.createElement('button');
  btnUpdate.id = BTN_ACCEPT; btnUpdate.className = 'primary'; btnUpdate.textContent = 'Update';

  right.append(btnLater, btnUpdate);
  toast.append(left, right);
  document.body.appendChild(toast);

  return toast;
}

function els() {
  const toast = ensureToastDOM();
  return {
    toast,
    accept: document.getElementById(BTN_ACCEPT),
    dismiss: document.getElementById(BTN_DISMISS),
    versionLabel: document.getElementById(APP_VERSION_LABEL_ID),
    leftTitle: toast?.querySelector('strong'),
    leftSub: toast?.querySelector('.muted'),
  };
}

/* =========================
   UI controls
   ========================= */
function showToast() {
  const { toast } = els();
  if (!toast) return;
  toast.hidden = false;
  // Soft announce
  try { toast.focus?.(); } catch {}
}

function hideToast() {
  const { toast } = els();
  if (!toast) return;
  toast.hidden = true;
}

function setToastCopy(current, incoming) {
  const { leftTitle, leftSub } = els();
  if (!leftTitle || !leftSub) return;

  // If we know both versions, show richer copy
  if (incoming) {
    leftTitle.textContent = `New version available`;
    leftSub.textContent = current
      ? `Installed: ${current} → Ready: ${incoming}. Tap Update to refresh.`
      : `Ready: ${incoming}. Tap Update to refresh.`;
    return;
  }
  // Default copy
  leftTitle.textContent = 'Update available';
  leftSub.textContent = 'Tap to refresh to the latest version.';
}

/* =========================
   Version label helpers
   ========================= */
function readCurrentVersionFromLabel() {
  const { versionLabel } = els();
  if (!versionLabel) return null;

  // Try to parse “Whylee v7000” or similar
  const txt = (versionLabel.textContent || '').trim();
  const m = txt.match(/v(\d+)/i);
  return m ? m[1] : null;
}

function rememberSeen(version) {
  if (!version) return;
  try { localStorage.setItem(STORAGE_KEY_LAST_SEEN, String(version)); } catch {}
}

function lastSeen() {
  try { return localStorage.getItem(STORAGE_KEY_LAST_SEEN) || null; } catch { return null; }
}

/* =========================
   SW interactions
   ========================= */
async function acceptAndReload() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });

      // When controller changes → new SW took control
      const onChange = () => {
        navigator.serviceWorker.removeEventListener('controllerchange', onChange);
        // tiny delay avoids cache race
        setTimeout(() => location.reload(), 100);
      };
      navigator.serviceWorker.addEventListener('controllerchange', onChange);
      return;
    }
    location.reload();
  } catch {
    location.reload();
  }
}

function wireButtons() {
  const { accept, dismiss } = els();
  accept?.addEventListener('click', acceptAndReload);
  dismiss?.addEventListener('click', hideToast);
}

async function checkRegistrationForUpdate() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    // If waiting worker exists, prompt
    if (reg.waiting) {
      log('Waiting SW detected; showing prompt.');
      setToastCopy(readCurrentVersionFromLabel(), incomingVersion);
      showToast();
    }

    // If a new worker installs while the page is open, prompt
    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          log('Installed new SW; prompting user.');
          setToastCopy(readCurrentVersionFromLabel(), incomingVersion);
          showToast();
        }
      });
    });
  } catch (e) {
    warn('checkRegistrationForUpdate error:', e);
  }
}

function listenForBroadcasts() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (e) => {
    const msg = e?.data || {};
    if (msg.type === 'NEW_VERSION') {
      incomingVersion = msg.version || incomingVersion;
      log('Broadcast NEW_VERSION', incomingVersion || '(no version)');
      setToastCopy(readCurrentVersionFromLabel(), incomingVersion);

      // Avoid re-prompt if we’ve already acknowledged this version
      const seen = lastSeen();
      if (incomingVersion && seen && seen === String(incomingVersion)) {
        log('Version already acknowledged; suppressing toast.');
        return;
      }
      showToast();
    }
  });
}

/* =========================
   Polling / visibility
   ========================= */
function startPolling() {
  stopPolling();
  POLL_HANDLE = setInterval(checkRegistrationForUpdate, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (POLL_HANDLE) { clearInterval(POLL_HANDLE); POLL_HANDLE = null; }
}

function setupVisibilityHandlers() {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkRegistrationForUpdate();
      startPolling();
    } else {
      stopPolling();
    }
  });
}

/* =========================
   Boot
   ========================= */
(function init() {
  // Mount UI and wire
  ensureToastDOM();
  wireButtons();

  // Listen for SW signals and check current state
  listenForBroadcasts();
  checkRegistrationForUpdate();

  // Start periodic checks & handle tab visibility
  startPolling();
  setupVisibilityHandlers();

  // Record the current version so we can suppress repeat prompts later
  // (We record the installed version visible on the page, not the incoming one)
  const current = readCurrentVersionFromLabel();
  if (current) rememberSeen(current);

  log('updatePrompt initialized.');
})();
