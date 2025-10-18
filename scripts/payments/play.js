// /scripts/payments/play.js
// Listens for native purchase results (TWA bridge) and posts purchaseToken -> uid to Functions.
// Usage: import this once on pages that initiate purchases.

import { auth } from "/scripts/firebase-bridge.js";

async function linkToken(purchaseToken, sku) {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Not signed in");
    const r = await fetch("/linkPurchaseToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchaseToken, uid, sku }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || "Link failed");
    console.log("[play] token linked");
  } catch (e) {
    console.error("[play] link error", e);
  }
}

// Listen for native -> web messages via TWA (see JsBridge.sendPlayPurchaseResult)
window.addEventListener("message", async (ev) => {
  try {
    const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "PLAY_PURCHASE_RESULT") {
      const { sku = "pro", purchaseToken } = data;
      if (purchaseToken) await linkToken(purchaseToken, sku);
      // Optional UI toast:
      if (window?.toast) toast("✅ Purchase received. Activating Pro…");
    }
  } catch (e) {
    // ignore malformed messages
  }
});

// Helper to request native purchase
export function startPlayPurchase({ sku = "whylee_pro_monthly" } = {}) {
  const payload = JSON.stringify({ type: "PLAY_PURCHASE", sku, uid: auth.currentUser?.uid || "" });
  // Prefer TWA postMessage channel (injected by native)
  if (window.WhyleeNative?.postMessage) {
    window.WhyleeNative.postMessage(payload);
  } else if (window.parent !== window) {
    window.parent.postMessage(payload, "*");
  } else {
    // Fallback: show UI explaining this is Android-only
    alert("Purchases available in the Android app.");
  }
}
