/**
 * ============================================================================
 * Whylee — State / Entitlements (v1)
 * ----------------------------------------------------------------------------
 * Provides a single, reactive snapshot of a user’s entitlements:
 *   - Free tier (default)
 *   - Trial active (3-day access to Pro)
 *   - Pro subscriber (ongoing)
 *
 * Handles:
 *   - Reading and writing entitlements to localStorage
 *   - Determining trial eligibility
 *   - Expiring trials after 72 hours
 *   - Returning consistent { pro, trialActive, canAccessPro, daysLeft }
 * ----------------------------------------------------------------------------
 * Import with:  import * as Entitlements from '/scripts/state/entitlements.js'
 * ============================================================================
 */

export const STORAGE_KEY = 'whylee_entitlements_v1';

/**
 * Default snapshot.
 */
const defaultSnapshot = {
  pro: false,
  trialActive: false,
  trialStart: null,
  daysLeft: 0,
};

/**
 * Load from localStorage.
 */
export function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data) return { ...defaultSnapshot };
    return validate(data);
  } catch {
    return { ...defaultSnapshot };
  }
}

/**
 * Save to localStorage.
 */
function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Validate or repair structure.
 */
function validate(data) {
  const state = { ...defaultSnapshot, ...data };
  if (state.trialActive && state.trialStart) {
    const now = Date.now();
    const start = new Date(state.trialStart).getTime();
    const msElapsed = now - start;
    const days = 3 - Math.floor(msElapsed / (1000 * 60 * 60 * 24));
    if (days <= 0) {
      // Expired trial
      state.trialActive = false;
      state.trialStart = null;
      state.daysLeft = 0;
      save(state);
    } else {
      state.daysLeft = days;
    }
  }
  return state;
}

/**
 * Determine eligibility for a new trial.
 * Can start a new trial if:
 *   - User is not Pro
 *   - No active trial
 *   - No previous trial recorded
 */
export function canStartTrial() {
  const s = load();
  return !s.pro && !s.trialActive && !s.trialStart;
}

/**
 * Start a 3-day trial.
 */
export function startTrial() {
  const state = {
    pro: false,
    trialActive: true,
    trialStart: new Date().toISOString(),
    daysLeft: 3,
  };
  save(state);
  return state;
}

/**
 * Upgrade to full Pro (after successful billing).
 */
export function upgradeToPro() {
  const state = {
    pro: true,
    trialActive: false,
    trialStart: null,
    daysLeft: 0,
  };
  save(state);
  return state;
}

/**
 * Return the clean entitlement snapshot.
 */
export function getSnapshot() {
  return validate(load());
}

/**
 * Derived helper — convenient for UI checks.
 */
export function canAccessPro() {
  const s = getSnapshot();
  return s.pro || s.trialActive;
}

/**
 * Clear all entitlements (useful for debugging or logout).
 */
export function reset() {
  localStorage.removeItem(STORAGE_KEY);
  return { ...defaultSnapshot };
}
