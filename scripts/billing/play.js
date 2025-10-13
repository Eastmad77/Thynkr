/**
 * ============================================================================
 * Whylee — /scripts/billing/play.js (v7000)
 * ----------------------------------------------------------------------------
 * Play Billing bridge for TWA (Android).
 * - In Web/PWA: methods safely no-op or simulate results
 * - In TWA: expect a global injected object (e.g. window.PlayBilling) that
 *           exposes: startTrial(), purchasePro(), getEntitlements()
 *
 * Pair with entitlements.js to normalize snapshot.
 * ============================================================================
 */

import Entitlements from '/scripts/state/entitlements.js';

const HAS_NATIVE = () => typeof window !== 'undefined' && !!window.PlayBilling;

export async function startTrial({ days = 3 } = {}) {
  if (!HAS_NATIVE()) {
    // Web fallback: optimistic local trial (server should verify later)
    const ends = Entitlements.startTrialForDays(days);
    return { ok: true, mode: 'web-fallback', trialEndsAt: ends };
  }
  try {
    const res = await window.PlayBilling.startTrial({ days });
    await _refreshFromNative();
    return res;
  } catch (e) {
    console.error('[PlayBilling] startTrial failed', e);
    throw e;
  }
}

export async function purchasePro() {
  if (!HAS_NATIVE()) {
    // Web fallback: direct stripe path should be used instead of this bridge
    return { ok: false, reason: 'no-native', hint: 'Use Stripe in web mode' };
  }
  try {
    const res = await window.PlayBilling.purchasePro();
    await _refreshFromNative();
    return res;
  } catch (e) {
    console.error('[PlayBilling] purchasePro failed', e);
    throw e;
  }
}

export async function refreshEntitlements() {
  if (!HAS_NATIVE()) {
    // Try your status endpoint instead (Entitlements.refreshRemote in app code)
    return { ok: false, reason: 'no-native' };
  }
  try {
    await _refreshFromNative();
    return { ok: true, snapshot: Entitlements.get() };
  } catch (e) {
    console.error('[PlayBilling] refreshEntitlements failed', e);
    return { ok: false, reason: 'native-error' };
  }
}

async function _refreshFromNative() {
  const remote = await window.PlayBilling.getEntitlements();
  if (!remote || typeof remote !== 'object') throw new Error('bad-native-snapshot');
  await Entitlements.refreshRemote(async () => remote);
}

export default {
  startTrial,
  purchasePro,
  refreshEntitlements,
};
