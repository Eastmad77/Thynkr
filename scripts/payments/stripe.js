// Stripe Checkout client helper
export async function startStripeCheckout({ uid, priceId }) {
  const origin = location.origin;
  const res = await fetch("/createCheckoutSession", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      uid,
      priceId,
      successUrl: `${origin}/pro-success.html`,
      cancelUrl: `${origin}/pro.html`
    })
  });
  const data = await res.json();
  if (data.url) {
    location.href = data.url;
  } else {
    throw new Error(data.error || "Could not start checkout.");
  }
}
