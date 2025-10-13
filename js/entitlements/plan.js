// ============================================================================
// entitlements/plan.js — Central entitlement state manager
// -----------------------------------------------------------------------------
// Provides one source of truth for determining user access level and Pro status.
// Integrates with Firebase Auth + Firestore + Stripe or Play Billing snapshot.
// ============================================================================

export const planState = {
  plan: 'free',           // 'free' | 'trial' | 'pro'
  trialActive: false,     // true if user is within active 3-day trial
  trialEndsAt: null,      // timestamp (ms)
  isPro: false,           // convenience flag
  lastSynced: null        // last Firestore sync timestamp
};

/**
 * Initialize entitlement state
 * @param {object} snapshot - user doc snapshot from Firestore
 */
export function loadEntitlements(snapshot) {
  if (!snapshot || !snapshot.exists) {
    resetEntitlements();
    return;
  }

  const data = snapshot.data();
  planState.plan = data.plan || 'free';
  planState.trialActive = !!data.trialActive;
  planState.trialEndsAt = data.trialEndsAt || null;
  planState.isPro = planState.plan === 'pro';
  planState.lastSynced = Date.now();
}

/**
 * Return computed entitlement object (used by UI + logic)
 */
export function getEntitlements() {
  const now = Date.now();

  // Expire trial if past date
  if (planState.trialActive && planState.trialEndsAt && now > planState.trialEndsAt) {
    planState.trialActive = false;
    planState.plan = 'free';
    planState.isPro = false;
  }

  return {
    ...planState,
    expired: planState.plan === 'free' && !planState.trialActive
  };
}

/**
 * Helper to set plan to Pro
 */
export function setPro() {
  planState.plan = 'pro';
  planState.isPro = true;
  planState.trialActive = false;
}

/**
 * Reset back to free
 */
export function resetEntitlements() {
  planState.plan = 'free';
  planState.trialActive = false;
  planState.trialEndsAt = null;
  planState.isPro = false;
  planState.lastSynced = null;
}
