/**
 * Play Billing bridge for TWA/Android wrapper.
 * The Android container should respond to postMessage with purchaseToken + uid.
 */
export function startPlayPurchase({ uid, sku = "pro" }) {
  const payload = JSON.stringify({ type: "PLAY_PURCHASE", sku, uid });
  if (window.AndroidBilling?.postMessage) {
    window.AndroidBilling.postMessage(payload);
  } else if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(payload);
  } else {
    alert("Play purchase unavailable on this build.");
  }
}

export function initPlayBridge() {
  window.addEventListener("message", async (ev) => {
    let data;
    try { data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data; } catch { return; }
    if (data?.type !== "PLAY_PURCHASE_RESULT") return;

    const { purchaseToken, uid, sku } = data;
    if (!purchaseToken || !uid) return;

    await fetch("/linkPurchaseToken", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purchaseToken, uid, sku })
    });

    alert("Thanks! Your Pro will activate shortly.");
  });
}
