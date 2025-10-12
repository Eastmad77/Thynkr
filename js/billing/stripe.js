/* =========================================================
   Whylee v7 — Stripe Client Helper
   - Starts 3-day trial via Netlify Function
   ========================================================= */
window.WhyleeStripe = (() => {
  async function startTrialCheckout(){
    try{
      const res = await fetch('/.netlify/functions/stripe/createCheckoutSession', { method:'POST' });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      if (url) location.href = url;
    }catch(err){
      console.error('[Whylee] Stripe checkout error', err);
      alert('Checkout temporarily unavailable. Please try again later.');
    }
  }
  return { startTrialCheckout };
})();
