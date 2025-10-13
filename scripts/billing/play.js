/**
 * ============================================================================
 * Whylee — Billing / Google Play bridge (TWA) (v1)
 * ----------------------------------------------------------------------------
 * This is a thin client-side adapter that calls into a native layer exposed
 * by a Trusted Web Activity (TWA) or WebView billing bridge when available.
 *
 * Expected Android interface (if present):
 *   window.AndroidBilling.startTrialPurchase(jsonString)
 *   window.AndroidBilling.startSubscription(jsonString)
 *
 * These methods should return a JSON string or trigger a callback/event.
 * Here we implement graceful no-op fallbacks for web.
 *
 * Usage:
 *   import * as PlayBilling from '/scripts/billing/play.js';
 *   if (PlayBilling.isAvailable()) PlayBilling.startTrialPurchase({ sku: 'pro_monthly' });
 * ============================================================================
 */

const ANDROID_KEY = 'AndroidBilling';

export function isAvailable() {
  return typeof window !== 'undefined' && typeof window[ANDROID_KEY] !== 'undefined';
}

/**
 * Ask native bridge to start a 3-day trial purchase flow.
 * @param {{ sku?: string, metadata?: Record<string,string> }} opts
 * @returns {Promise<{ok:boolean, message?:string}>}
 */
export async function startTrialPurchase(opts = {}) {
  if (!isAvailable()) {
    return { ok: false, message: 'Play Billing bridge not available.' };
  }
  try {
    const payload = {
      sku: opts.sku || 'whylee_pro_monthly',
      metadata: { app: 'whylee', intent: 'trial-3day', ...(opts.metadata || {}) }
    };
    const raw = window[ANDROID_KEY].startTrialPurchase(JSON.stringify(payload));
    const result = parseMaybeJSON(raw);
    return { ok: true, ...result };
  } catch (err) {
    console.error('[PlayBilling] startTrialPurchase error:', err);
    return { ok: false, message: 'Billing failed to start.' };
  }
}

/**
 * Start a normal subscription purchase (no trial).
 * @param {{ sku?: string, metadata?: Record<string,string> }} opts
 */
export async function startSubscription(opts = {}) {
  if (!isAvailable()) {
    return { ok: false, message: 'Play Billing bridge not available.' };
  }
  try {
    const payload = {
      sku: opts.sku || 'whylee_pro_monthly',
      metadata: { app: 'whylee', intent: 'subscribe', ...(opts.metadata || {}) }
    };
    const raw = window[ANDROID_KEY].startSubscription(JSON.stringify(payload));
    const result = parseMaybeJSON(raw);
    return { ok: true, ...result };
  } catch (err) {
    console.error('[PlayBilling] startSubscription error:', err);
    return { ok: false, message: 'Billing failed to start.' };
  }
}

function parseMaybeJSON(raw) {
  if (typeof raw !== 'string') return {};
  try { return JSON.parse(raw); } catch { return {}; }
}
