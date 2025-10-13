// ============================================================================
// Whylee — Play Billing Bridge (for Android Trusted Web Activity - TWA)
// ============================================================================
//
// Purpose:
// Provides compatibility for Android users who install Whylee from Google Play.
// The host Android shell (TWA wrapper) injects a JS bridge object:
//   window.WhyleePlayBridge
// which exposes a function buyTrial(sku) → Promise<{ ok, token, expiry, error }>
// ============================================================================

// Check if the Android Play Billing bridge is present
export function isPlayBillingAvailable() {
  return typeof window !== 'undefined' && !!window.WhyleePlayBridge;
}

// Trigger an Android trial purchase flow through the injected bridge
export async function startAndroidTrialPurchase({ sku = 'whylee_pro_trial' } = {}) {
  if (!isPlayBillingAvailable()) {
    throw new Error('Play Billing bridge not available');
  }

  // Expected native implementation:
  //   buyTrial(sku) → { ok, token, expiry, error }
  const res = await window.WhyleePlayBridge.buyTrial(sku);
  if (!res?.ok) {
    throw new Error(res?.error || 'Trial purchase failed');
  }

  // Return details for debugging or analytics (token, expiry date, etc.)
  return res;
}

// Example: fallback handler to prompt web-based Stripe checkout
export function fallbackToStripe() {
  import('/js/billing/stripe.js')
    .then(m => m.startProTrialCheckout())
    .catch(err => console.error('[Whylee] Fallback checkout failed:', err));
}

// Optional convenience binder
export function bindPlayTrial(selector = '#btn-pro') {
  const el = document.querySelector(selector);
  if (!el) return;

  el.addEventListener('click', async () => {
    try {
      if (isPlayBillingAvailable()) {
        await startAndroidTrialPurchase();
      } else {
        fallbackToStripe();
      }
    } catch (err) {
      console.error('[Whylee] Play trial error:', err);
      alert('Trial checkout unavailable at the moment.');
    }
  });
}
