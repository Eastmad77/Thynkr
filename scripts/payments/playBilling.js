/**
 * Play Billing bridge for TWA/Android wrapper.
 * The Android app should listen to `postMessage` and respond back with purchaseToken + uid.
 */
export function startPlayPurchase({ uid, sku = "pro" }) {
  // Bridge message for native container
  const message = JSON.stringify({ type: "PLAY_PURCHASE", sku, uid });
  if (window.AndroidBilling && window.AndroidBilling.postMessage) {
    window.AndroidBilling.postMessage(message);
  } else if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
    window.ReactNativeWebView.postMessage(message);
  } else {
    alert("Play purchase unavailable on web build.");
  }
}

/**
 * Call this once in app bootstrap: it listens for native responses.
 * Expected payload: { type: "PLAY_PURCHASE_RESULT", sku, uid, purchaseToken }
 */
export function initPlayBridge() {
  window.addEventListener("message", async (ev) => {
    let data;
    try { data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data; } catch { return; }
    if (data?.type !== "PLAY_PURCHASE_RESULT") return;

    const { purchaseToken, uid, sku } = data;
    if (!purchaseToken || !uid) return;

    // Store mapping so RTDN can look up uid from token
    await fetch("/linkPurchaseToken", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purchaseToken, uid, sku })
    });

    // Optimistic UI
    alert("Thanks! Your Pro will activate shortly.");
  });
}
