// Whylee – House Ads visibility controller (v9)
// Hides elements with `.promo-if-free` when user is Pro.

import { auth } from "/scripts/firebase-bridge.js";
import { isPro } from "/scripts/entitlements.js";

async function applyHouseAdsVisibility() {
  try {
    const uid = auth.currentUser?.uid;
    const pro = await isPro(uid);
    document.querySelectorAll(".promo-if-free").forEach(el => {
      el.classList.toggle("promo-hide", !!pro);
    });
  } catch (e) {
    // Fail open (show promos) if we can't determine; log for admin
    console.warn("[houseAds] visibility check failed:", e);
  }
}

// Run once on load; you can re-run after auth state changes if needed.
applyHouseAdsVisibility();
export { applyHouseAdsVisibility };
