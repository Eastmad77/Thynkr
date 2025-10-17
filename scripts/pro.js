/**
 * Whylee Pro Subscription Client (v8)
 * Path: /scripts/pro.js
 *
 * Uses Firebase Functions endpoints:
 *  - POST /createCheckoutSession      (Functions)
 *  - Stripe webhook turns proStatus on server-side
 */

import { auth } from "./auth/firebase-bridge.js";         // keep your existing pathing if different
import { getUserDoc, setProEnabled } from "./auth/cloudsync.js";

const FN_BASE =
  // If hosted on Firebase Hosting, relative paths proxy to CF v2 by domain.
  // If on Netlify, set NETLIFY_FN_BASE in env and pass full path.
  window.NETLIFY_FN_BASE || "https://us-central1-dailybrainbolt.cloudfunctions.net";

export async function getProStatus() {
  const data = await getUserDoc();
  return !!data?.proStatus;
}

/**
 * Start checkout with Stripe
 * @param {string} priceId Stripe Price ID
 * @param {Object} opts { successUrl?, cancelUrl? }
 */
export async function startProCheckout(priceId, opts = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Must be signed in");
  const success_url = opts.successUrl || `${location.origin}/pro-success.html`;
  const cancel_url  = opts.cancelUrl  || `${location.origin}/pro.html`;

  const res = await fetch(`${FN_BASE}/createCheckoutSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: user.uid,
      priceId,
      success_url,
      cancel_url
    })
  });

  const json = await res.json();
  if (!json.ok || !json.url) throw new Error(json.error || "Checkout error");
  // Redirect to Stripe Hosted Checkout
  location.href = json.url;
}

/**
 * Helper to reflect Pro state in UI immediately (optimistic),
 * while webhook will confirm server-side within seconds.
 */
export async function markProOptimistic() {
  try { await setProEnabled(true); } catch (_) {}
}

/**
 * Wire basic UI:
 *  - #goProBtn starts checkout
 *  - [data-pro-gate] elements toggle visibility by status
 */
export function wireProUI({ priceId }) {
  const btn = document.querySelector("#goProBtn");
  if (btn) {
    btn.addEventListener("click", () => startProCheckout(priceId).catch(err => alert(err.message)));
  }

  const gates = [...document.querySelectorAll("[data-pro-gate]")];
  const render = async () => {
    const isPro = await getProStatus();
    gates.forEach(el => {
      const mode = el.getAttribute("data-pro-gate"); // "pro-only" | "free-only"
      const show = (mode === "pro-only") ? isPro : !isPro;
      el.style.display = show ? "" : "none";
    });
  };

  // run at start and when auth changes
  render();
  auth.onAuthStateChanged(render);
}
