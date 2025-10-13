// Whylee — client billing helper (Stripe Checkout)
// Usage: import { startProTrialCheckout } from '/js/billing/stripe.js'
export async function startProTrialCheckout(opts = {}) {
  const {
    plan = 'pro_monthly',           // descriptive label, not sent to Stripe
    trialDays = 3,                   // default 3-day trial
    email = null,                    // optional prefill
    userId = null,                   // optional (for metadata)
  } = opts;

  const btn = document.getElementById('btn-pro') || null;
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/.netlify/functions/stripe/createCheckoutSession', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        trialDays,
        plan,
        email,
        userId
      })
    });

    if (!res.ok) {
      const tx = await res.text().catch(()=> '');
      throw new Error(`[stripe] ${res.status} ${tx}`);
    }

    const data = await res.json();
    if (data?.url) {
      location.href = data.url;
      return;
    }
    throw new Error('Stripe did not return a checkout URL.');
  } catch (err) {
    console.error('startProTrialCheckout failed:', err);
    // Soft UI feedback (you can replace with a nicer toast)
    const el = document.getElementById('pro-status');
    if (el) el.textContent = 'Checkout temporarily unavailable. Please try again.';
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Optional: simple banner CTA binder (call once on pro page)
export function bindProCta(selector = '#btn-pro') {
  const el = document.querySelector(selector);
  if (!el) return;
  el.addEventListener('click', () => startProTrialCheckout());
}
