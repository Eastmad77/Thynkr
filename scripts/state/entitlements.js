/**
 * =============================================================================
 * Whylee — state/entitlements (v7000)
 * -----------------------------------------------------------------------------
 * Purpose:
 *   - Single, reliable source for the user's entitlements:
 *       { pro: boolean, trialActive: boolean, trialEndsAt: ISOString|null }
 *   - Merges local state with server (Stripe/Play/Firebase) when available
 *   - Emits change events so UI can react instantly
 *   - Guards for trial expiry and edge-cases (clock skew, stale cache)
 *
 * Storage:
 *   localStorage key: 'whylee:entitlements'
 *
 * Usage:
 *   import Entitlements from '/scripts/state/entitlements.js';
 *   await Entitlements.init({ fetchRemote: yourAsyncFetcher });
 *   if (Entitlements.isPro()) { ... }
 *   Entitlements.on('change', snap => { ...update UI... });
 *
 * Remote contract (optional):
 *   fetchRemote() → Promise<{ pro:boolean, trialActive:boolean, trialEndsAt:string|null }>
 * =============================================================================
 */

const STORAGE_KEY = 'whylee:entitlements';
const EVT_CHANGE  = 'change';

// Default snapshot (never null)
const defaultSnap = () => ({
  pro: false,
  trialActive: false,
  trialEndsAt: null, // ISO string or null
  // Optional provenance flags (for debugging/telemetry)
  _source: 'default',    // 'default' | 'local' | 'remote-merge'
  _updatedAt: new Date().toISOString(),
});

// --- Lightweight emitter -----------------------------------------------------
const listeners = new Set();
function emit(type, payload) {
  if (type !== EVT_CHANGE) return;
  listeners.forEach(fn => {
    try { fn(payload); } catch (e) { console.error('[Entitlements] listener error', e); }
  });
}

// --- Local storage helpers ---------------------------------------------------
function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;
    return obj;
  } catch { return null; }
}
function saveLocal(snap) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snap)); } catch {}
}

// --- Time helpers ------------------------------------------------------------
function nowMs() { return Date.now(); }
function isoToMs(iso) { try { return new Date(iso).getTime(); } catch { return NaN; } }
function hasExpired(iso) {
  if (!iso) return false;
  const t = isoToMs(iso);
  if (!isFinite(t)) return false;
  // small 30s grace window to reduce flicker
  return t + 30_000 < nowMs();
}

// --- In-memory state ---------------------------------------------------------
let SNAPSHOT = defaultSnap();

// Normalize and apply trial expiry rule
function normalize(s) {
  const snap = {
    pro: !!s.pro,
    trialActive: !!s.trialActive,
    trialEndsAt: s.trialEndsAt || null,
    _source: s._source || 'local',
    _updatedAt: new Date().toISOString(),
  };

  // If Pro, trial flags are irrelevant (force off for clarity)
  if (snap.pro) {
    snap.trialActive = false;
    snap.trialEndsAt = null;
    return snap;
  }

  // Not pro → enforce trial expiry
  if (snap.trialActive && hasExpired(snap.trialEndsAt)) {
    snap.trialActive = false;
    snap.trialEndsAt = null;
  }
  return snap;
}

// Merge precedence: remote truth > local, but always normalize
function mergeRemote(local, remote) {
  const merged = {
    pro: !!remote.pro || !!local.pro, // if remote says true, force true; if remote false but local true from prior session, keep true until remote updates again
    trialActive: !!remote.trialActive,
    trialEndsAt: remote.trialEndsAt || null,
    _source: 'remote-merge',
    _updatedAt: new Date().toISOString(),
  };
  return normalize(merged);
}

// Public API ------------------------------------------------------------------
const Entitlements = {
  /**
   * Initialize entitlements.
   * @param {Object} [opts]
   * @param {() => Promise<{pro:boolean,trialActive:boolean,trialEndsAt:string|null}>} [opts.fetchRemote]
   * @param {boolean} [opts.deferRemote=false]  If true, don’t fetch immediately; call refreshRemote() later.
   */
  async init(opts = {}) {
    // 1) local first (fast path)
    const local = loadLocal();
    SNAPSHOT = normalize(local || defaultSnap());
    SNAPSHOT._source = local ? 'local' : 'default';
    saveLocal(SNAPSHOT);
    emit(EVT_CHANGE, { ...SNAPSHOT });

    // 2) remote (optional)
    if (opts.fetchRemote && !opts.deferRemote) {
      await this.refreshRemote(opts.fetchRemote);
    }
  },

  /**
   * Re-fetch remote snapshot and merge.
   * Pass the same fetcher you used for init, or a new one.
   */
  async refreshRemote(fetchRemote) {
    if (!fetchRemote) return { ok: false, reason: 'no-fetcher' };
    try {
      const remote = await fetchRemote();
      if (!remote || typeof remote !== 'object') {
        return { ok: false, reason: 'bad-remote' };
      }
      const next = mergeRemote(SNAPSHOT, remote);
      if (JSON.stringify(next) !== JSON.stringify(SNAPSHOT)) {
        SNAPSHOT = next;
        saveLocal(SNAPSHOT);
        emit(EVT_CHANGE, { ...SNAPSHOT });
      }
      return { ok: true, snapshot: { ...SNAPSHOT } };
    } catch (e) {
      console.warn('[Entitlements] remote fetch failed:', e);
      // Still enforce local trial expiry on failure
      const next = normalize(SNAPSHOT);
      if (JSON.stringify(next) !== JSON.stringify(SNAPSHOT)) {
        SNAPSHOT = next;
        saveLocal(SNAPSHOT);
        emit(EVT_CHANGE, { ...SNAPSHOT });
      }
      return { ok: false, reason: 'fetch-error' };
    }
  },

  // --- Mutators (client-side hints; backend remains source of truth) --------

  /** Set Pro locally (e.g., after a confirmed purchase webhook reflected in remote) */
  setPro(value) {
    const next = normalize({ ...SNAPSHOT, pro: !!value, _source: 'local' });
    if (JSON.stringify(next) !== JSON.stringify(SNAPSHOT)) {
      SNAPSHOT = next;
      saveLocal(SNAPSHOT);
      emit(EVT_CHANGE, { ...SNAPSHOT });
    }
  },

  /** Start a local trial (UI hint). Pair with real billing activation. */
  startTrialForDays(days = 3) {
    if (SNAPSHOT.pro) return; // pro users don’t need trial
    const ms = Math.max(1, days) * 24 * 60 * 60 * 1000;
    const ends = new Date(nowMs() + ms).toISOString();
    const next = normalize({
      ...SNAPSHOT,
      trialActive: true,
      trialEndsAt: ends,
      _source: 'local'
    });
    SNAPSHOT = next;
    saveLocal(SNAPSHOT);
    emit(EVT_CHANGE, { ...SNAPSHOT });
    return ends;
  },

  /** End local trial immediately */
  endTrial() {
    if (!SNAPSHOT.trialActive) return;
    const next = normalize({
      ...SNAPSHOT,
      trialActive: false,
      trialEndsAt: null,
      _source: 'local',
    });
    SNAPSHOT = next;
    saveLocal(SNAPSHOT);
    emit(EVT_CHANGE, { ...SNAPSHOT });
  },

  // --- Read API --------------------------------------------------------------

  /** Current snapshot (immutable copy) */
  get() { return { ...SNAPSHOT }; },

  /** True if Pro is active */
  isPro() { return !!SNAPSHOT.pro; },

  /** True if a trial is active and not expired */
  isTrialActive() {
    return !!SNAPSHOT.trialActive && !hasExpired(SNAPSHOT.trialEndsAt);
  },

  /** Milliseconds remaining in trial (0 if none/expired) */
  trialMsRemaining() {
    if (!this.isTrialActive()) return 0;
    return Math.max(0, isoToMs(SNAPSHOT.trialEndsAt) - nowMs());
  },

  /** ISO end date of trial, or null */
  trialEndsAt() {
    return this.isTrialActive() ? SNAPSHOT.trialEndsAt : null;
  },

  // --- Events ----------------------------------------------------------------
  on(type, fn) {
    if (type !== EVT_CHANGE || typeof fn !== 'function') return () => {};
    listeners.add(fn);
    // Emit current on subscribe for immediate UI sync
    try { fn({ ...SNAPSHOT }); } catch {}
    return () => listeners.delete(fn);
  },
};

export default Entitlements;

/* =============================================================================
 * Example remote fetcher (keep in your app code — shown here for reference)
 * -----------------------------------------------------------------------------
 * async function fetchRemoteEntitlements() {
 *   // 1) Try Firebase (if user signed in)
 *   // const doc = await getDoc(doc(db, 'users', uid));
 *   // if (doc.exists()) return doc.data().entitlements;
 *
 *   // 2) Fallback: call your Netlify function
 *   // const res = await fetch('/.netlify/functions/status');
 *   // const json = await res.json();
 *   // return json.entitlements;
 *
 *   return { pro: false, trialActive: false, trialEndsAt: null };
 * }
 *
 * // Boot:
 * await Entitlements.init({ fetchRemote: fetchRemoteEntitlements });
 * =============================================================================
 */
