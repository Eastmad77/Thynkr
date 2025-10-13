/**
 * ============================================================================
 * Whylee — Billing / Stripe client helper (v1)
 * ----------------------------------------------------------------------------
 * Responsibilities:
 *  - Starts a 3-day trial (card required) via Netlify Function → Stripe Checkout
 *  - Handles redirect and basic error display
 *  - No secrets here; all keys live in serverless functions
 *
 * Server endpoints expected:
 *   /.netlify/functions/stripe/createCheckoutSession
 *   /.netlify/functions/stripe/webhook            (server → Stripe events)
 *
 * Usage:
 *   import * as StripeBilling from '/scripts/billing/stripe.js';
 *   await StripeBilling.startTrialCheckout({ plan: 'pro_monthly' });
 * ============================================================================
 */

const ENDPOINT = '/.netlify/functions/stripe/createCheckoutSession';

/**
 * Starts a Stripe Checkout session for 3-day trial (card capture).
 * @param {{plan?: string, metadata?: Record<string,string>}} opts
 * @returns {Promise<void>}
 */
export async function startTrialCheckout(opts = {}) {
  try {
    const body = {
      plan: opts.plan || 'pro_monthly',
      // Anything you want echoed into Stripe metadata for reconciliation
      metadata: {
        app: 'whylee',
        intent: 'trial-3day',
        ...opts.metadata
      }
    };

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // Important: avoid sending credentials/cookies unless needed
      credentials: 'same-origin'
    });

    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(`Stripe session failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    if (!data?.url) {
      throw new Error('Stripe session did not return a URL.');
    }

    // Redirect to Stripe-hosted checkout
    window.location.assign(data.url);
  } catch (err) {
    console.error('[Billing] startTrialCheckout error:', err);
    alert('Checkout is temporarily unavailable. Please try again in a moment.');
  }
}

/**
 * Optional: Open standard (non-trial) checkout.
 * @param {{plan?: string, metadata?: Record<string,string>}} opts
 */
export async function startDirectCheckout(opts = {}) {
  // For parity, the server can branch on metadata.intent === 'subscribe'
  return startTrialCheckout({ ...opts, metadata: { ...(opts.metadata||{}), intent: 'subscribe' } });
}

/**
 * Lightweight helper to get response text (even on non-200)
 */
async function safeText(res) {
  try { return await res.text(); } catch { return '<body read error>'; }
}
