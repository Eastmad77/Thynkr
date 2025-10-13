// ============================================================================
// Whylee — Stripe Billing Helper (client-side)
// Handles 3-day Pro trial and standard subscription checkout flow via Netlify.
// ============================================================================

// Usage:
// import { startProTrialCheckout, bindProCta } from '/js/billing/stripe.js';
// bindProCta('#btn-pro'); // optional auto-binding to CTA

export async function startProTrialCheckout(opts = {}) {
  const {
    plan = 'pro_monthly',       // Label only, for metadata
    trialDays = 3,              // Default 3-day trial
    email = null,               // Optional prefill
    userId = null               // Optional (e.g. Firebase UID)
  } = opts;

  const btn = document.getElementById('btn-pro') || null;
  if (btn) btn.disabled = true;

  try {
    // Hit Netlify function endpoint
    const res = await fetch('/.netlify/functions/stripe/createCheckoutSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, trialDays, email, userId })
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`[stripe] ${res.status} ${text}`);
    }

    const data = await res.json();

    if (data?.url) {
      // Redirect to Stripe Checkout
      window.location.href = data.url;
      return;
    }

    throw new Error('Stripe did not return a checkout URL.');

  } catch (err) {
    console.error('[Whylee] startProTrialCheckout error:', err);

    // Display simple UI feedback (replace with toast if you prefer)
    const el = document.getElementById('pro-status');
    if (el) el.textContent = 'Checkout temporarily unavailable. Please try again later.';
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ---------------------------------------------------------------------------
// Optional helper to attach trial checkout to a button automatically
// ---------------------------------------------------------------------------

export function bindProCta(selector = '#btn-pro') {
  const el = document.querySelector(selector);
  if (!el) return;
  el.addEventListener('click', () => startProTrialCheckout());
}

// ---------------------------------------------------------------------------
// Future enhancement: retrieve current plan or billing portal
// ---------------------------------------------------------------------------

export async function fetchBillingStatus() {
  try {
    const res = await fetch('/.netlify/functions/status');
    if (!res.ok) throw new Error('Status fetch failed');
    const data = await res.json();
    console.log('[Whylee] Billing status:', data);
    return data;
  } catch (err) {
    console.error('[Whylee] Billing status error:', err);
    return { error: err.message };
  }
}
