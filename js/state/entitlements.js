/**
 * entitlements.js — v7000
 * Normalizes and snapshots user entitlements in one place.
 * Source of truth for gating Pro features and trials.
 */
const LS_KEY = 'whylee:entitlements';

export function getEntitlements() {
  // Example shape stored in localStorage (synced by billing handlers)
  // {
  //   plan: 'free' | 'pro',
  //   trialActive: true|false,
  //   trialEndsAt: 1735689600000, // epoch ms
  //   proSince: 1733097600000
  // }
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    const now = Date.now();
    const trialActive = !!raw.trialActive && Number(raw.trialEndsAt || 0) > now;
    const isPro = raw.plan === 'pro' || trialActive;
    return {
      plan: raw.plan || 'free',
      trialActive,
      trialEndsAt: Number(raw.trialEndsAt || 0),
      proSince: Number(raw.proSince || 0),
      isPro
    };
  } catch {
    return { plan: 'free', trialActive: false, trialEndsAt: 0, proSince: 0, isPro: false };
  }
}

export function setEntitlements(next) {
  localStorage.setItem(LS_KEY, JSON.stringify(next || {}));
  dispatchEvent(new Event('entitlements:update'));
}

// Convenience guards
export const EntitlementGuards = {
  canUseProPosters: () => getEntitlements().isPro,
  canUseAmbientAudio: () => getEntitlements().isPro,
  canSeeReflection: () => getEntitlements().isPro
};
