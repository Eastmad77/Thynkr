// ============================================================================
// Netlify Function: Create Stripe Checkout Session (subscription + trial)
// ----------------------------------------------------------------------------
// ENV required in Netlify Site settings:
//   STRIPE_SECRET_KEY       -> your Stripe secret (sk_live_... or sk_test_...)
//   STRIPE_PRICE_ID         -> price_xxx for Pro monthly
// Optional:
//   STRIPE_SUCCESS_URL      -> override default success URL
//   STRIPE_CANCEL_URL       -> override default cancel URL
//   STRIPE_TRIAL_DAYS       -> default trial days (if not passed by client)
// ----------------------------------------------------------------------------
// Example client call (see /js/billing/stripe.js):
//   POST /.netlify/functions/stripe/createCheckoutSession
//   { plan: 'pro_monthly', trialDays: 3, email: 'user@x.com', userId: 'uid' }
// ============================================================================

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { default: Stripe } = await import('stripe');

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return json({ error: 'Missing STRIPE_SECRET_KEY' }, 500);

    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const origin = req.headers.get('origin') || 'https://whylee.netlify.app';
    const priceId = process.env.STRIPE_PRICE_ID || 'price_123';
    const trialDays = Number(
      body?.trialDays ?? process.env.STRIPE_TRIAL_DAYS ?? 3
    );

    const successURL = process.env.STRIPE_SUCCESS_URL || `${origin}/pro.html?status=success`;
    const cancelURL  = process.env.STRIPE_CANCEL_URL  || `${origin}/pro.html?status=cancel`;

    // Create subscription checkout with optional trial
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successURL,
      cancel_url: cancelURL,
      customer_email: body?.email || undefined,
      subscription_data: {
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        metadata: {
          app: 'whylee',
          plan: body?.plan || 'pro_monthly',
          userId: body?.userId || ''
        }
      }
      // Optionally require PM up-front:
      // payment_method_collection: 'always'
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('createCheckoutSession error:', err);
    return json({ error: String(err?.message || err) }, 500);
  }
};

// Utility: JSON response
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
