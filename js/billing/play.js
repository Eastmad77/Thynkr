// Whylee — Play Billing bridge (stub for TWA/Android)
// Expect a host app to inject window.WhyleePlayBridge with compatible APIs.

export function isPlayBillingAvailable() {
  return typeof window !== 'undefined' && !!window.WhyleePlayBridge;
}

export async function startAndroidTrialPurchase({ sku = 'whylee_pro_trial' } = {}) {
  if (!isPlayBillingAvailable()) {
    throw new Error('Play Billing bridge not available');
  }
  // Host app should implement: buyTrial(sku) -> { ok, token, error }
  const res = await window.WhyleePlayBridge.buyTrial(sku);
  if (!res?.ok) throw new Error(res?.error || 'Trial purchase failed');
  return res; // token, expiry, etc.
}
