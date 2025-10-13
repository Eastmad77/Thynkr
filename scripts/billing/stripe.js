/**
 * ============================================================================
 * Whylee — /scripts/billing/stripe.js (v7000)
 * ----------------------------------------------------------------------------
 * Client-side Stripe flow (Web/PWA):
 *   - POST → /.netlify/functions/stripe/createCheckoutSession
 *   - Redirect to Checkout (URL returned from function)
 *   - On return (success/cancel), refresh remote entitlements and/or set local hints
 *
 * Requirements:
 *   - Netlify Function: stripe/createCheckoutSession.js (trial-enabled)
 *   - Optional webhook: /.netlify/functions/stripe/webhook (server truth → Firebase)
 *   - Entitlements.init({ fetchRemote }) should exist in your app boot
 * ============================================================================
 */

import Entitlements from '/scripts/state/entitlements.js';

const ENDPOINTS = Object.freeze({
  createSession: '/.netlify/functions/stripe/createCheckoutSession',
  // Optional: use after redirect success/cancel if you expose a status endpoint
  status: '/.netlify/functions/status',
});

/**
 * Starts a Stripe trial checkout (3-day by default; server controls trial length).
 * Redirects the browser to Stripe-hosted Checkout.
 * Returns only if the function fails before redirecting.
 */
export async function startTrialCheckout({ plan = 'pro', source = 'app' } = {}) {
  try {
    const res = await fetch(ENDPOINTS.createSession, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // You can pass plan/metadata here if needed
      body: JSON.stringify({ plan, source }),
      credentials: 'include',
    });
    if (!res.ok) {
      const msg = await safeText(res);
      console.error('[Stripe] session create failed:', msg);
      throw new Error(`Checkout error (${res.status})`);
    }
    const { url, error } = await res.json();
    if (error) throw new Error(error);
    if (!url) throw new Error('Missing checkout URL');

    // Optional optimistic UX: mark local trial hinting before redirect.
    // NOTE: Server truth will correct this after return/webhook.
    try { Entitlements.startTrialForDays(3); } catch {}

    location.assign(url);
  } catch (err) {
    console.error('[Stripe] startTrialCheckout failed:', err);
    throw err;
  }
}

/**
 * Call on pages that can receive ?status=success|cancel after returning from Checkout.
 * It will refresh remote entitlements and reconcile the local snapshot.
 */
export async function reconcileAfterReturn() {
  // If you expose a status endpoint, you can check it; otherwise just refresh remote.
  try {
    await Entitlements.refreshRemote(defaultFetchRemoteStatus);
  } catch (e) {
    console.warn('[Stripe] reconcileAfterReturn remote refresh failed:', e);
  }
}

async function defaultFetchRemoteStatus() {
  try {
    const res = await fetch(ENDPOINTS.status, { credentials: 'include' });
    if (!res.ok) throw new Error('status endpoint not OK');
    const json = await res.json();
    // Expect { entitlements: { pro, trialActive, trialEndsAt } }
    return json?.entitlements || { pro: false, trialActive: false, trialEndsAt: null };
  } catch {
    // Fallback to local snapshot when offline/unavailable
    return Entitlements.get();
  }
}

async function safeText(res) {
  try { return await res.text(); } catch { return ''; }
}

export default {
  startTrialCheckout,
  reconcileAfterReturn,
};
