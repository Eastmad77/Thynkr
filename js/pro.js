/* Whylee — Pro / Upgrade client-side glue
   Path: /js/pro.js
   Note: This is the client UX. Real billing is handled server-side; here we simulate
   setting entitlements and redirecting after a successful checkout.
*/
import { setEntitlement, isPro, toast } from "./app.js";

const TIERS = ["pro-silver", "pro-gold", "pro-charcoal"];

export function initProPage() {
  const $status = document.querySelector('[data-pro="status"]');
  const $plans = document.querySelectorAll("[data-plan]");
  const $downgrade = document.querySelector('[data-pro="downgrade"]');

  $status.textContent = isPro() ? "You’re on Whylee Pro ✨" : "You’re on Free";

  $plans.forEach(btn => {
    btn.addEventListener("click", () => {
      const tier = btn.getAttribute("data-plan");
      if (!TIERS.includes(tier)) return;
      // In production: redirect to Stripe Checkout and set entitlement on webhook success.
      // For now we simulate success immediately:
      setEntitlement(tier);
      toast(`Upgraded to ${tier.replace("pro-", "Pro ").toUpperCase()}`);
      $status.textContent = "You’re on Whylee Pro ✨";
    });
  });

  $downgrade?.addEventListener("click", () => {
    setEntitlement("free");
    toast("You’re back on Free");
    $status.textContent = "You’re on Free";
  });
}
