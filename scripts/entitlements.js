// scripts/entitlements.js — v7000
import { Plans } from './plan.js';

const LS = {
  isPro: 'wl_is_pro',
  trialStart: 'wl_trial_start',
  trialActive: 'wl_trial_active',
  entitlements: 'wl_entitlements'
};

function daysBetween(a, b) {
  const ms = Math.abs(b - a);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export const Entitlements = (() => {
  function isPro() {
    try { return localStorage.getItem(LS.isPro) === '1'; } catch { return false; }
  }

  function startTrial() {
    const now = new Date();
    try {
      localStorage.setItem(LS.trialStart, now.toISOString());
      localStorage.setItem(LS.trialActive, '1');
    } catch {}
    dispatchEvent(new CustomEvent('wl:trial', { detail: { active: true, start: now } }));
  }

  function trialStatus() {
    let active = false, remaining = 0, daysUsed = 0;
    try {
      const raw = localStorage.getItem(LS.trialStart);
      const flag = localStorage.getItem(LS.trialActive) === '1';
      if (raw && flag) {
        const start = new Date(raw);
        daysUsed = daysBetween(start, new Date());
        remaining = Math.max(0, Plans.pro.trialDays - daysUsed);
        active = remaining > 0;
        if (!active) localStorage.setItem(LS.trialActive, '0');
      }
    } catch {}
    return { active, remaining, daysUsed };
  }

  function grantPro() {
    try {
      localStorage.setItem(LS.isPro, '1');
      localStorage.setItem(LS.trialActive, '0');
    } catch {}
    dispatchEvent(new CustomEvent('wl:pro', { detail: { isPro: true } }));
  }

  function revokePro() {
    try { localStorage.setItem(LS.isPro, '0'); } catch {}
    dispatchEvent(new CustomEvent('wl:pro', { detail: { isPro: false } }));
  }

  // Feature checks
  const can = {
    noAds: () => isPro(),
    bonusLevels: () => isPro(),
    reflectionsCloud: () => isPro() || trialStatus().active,
    premiumAvatars: () => isPro() || trialStatus().active
  };

  return { isPro, startTrial, trialStatus, grantPro, revokePro, can };
})();

// Backward-compatible global
window.WhyleePro = { isPro: Entitlements.isPro };
