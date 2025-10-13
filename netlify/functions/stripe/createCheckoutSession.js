// Netlify Function: Create Stripe Checkout Session (subscription + trial)
// ENV required:
//   STRIPE_SECRET_KEY    -> your Stripe secret
//   STRIPE_PRICE_ID      -> price_XXXX for Pro monthly
// Optional:
//   STRIPE_SUCCESS_URL   -> override default success
//   STRIPE_CANCEL_URL    -> override default cancel
//   STRIPE_TRIAL_DAYS    -> default trial days (fallback if not passed)

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { default: Stripe } = await import('stripe');
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return json({ error: 'Missing STRIPE_SECRET_KEY' }, 500);

    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });

    const body = await req.json().catch(() => ({}));
    const origin = req.headers.get('origin') || 'https://whylee.netlify.app';

    const successURL = process.env.STRIPE_SUCCESS_URL || `${origin}/pro.html?status=success`;
    const cancelURL  = process.env.STRIPE_CANCEL_URL  || `${origin}/pro.html?status=cancel`;

    const priceId = process.env.STRIPE_PRICE_ID || 'price_123';
    const trialDays = Number(
      body?.trialDays ?? process.env.STRIPE_TRIAL_DAYS ?? 3
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successURL,
      cancel_url: cancelURL,
      // If you want to require a payment method up-front:
      // payment_method_collection: 'always',
      subscription_data: {
        trial_period_days: trialDays > 0 ? trialDays : undefined,
        metadata: {
          app: 'whylee',
          plan: body?.plan || 'pro_monthly',
          userId: body?.userId || ''
        }
      },
      customer_email: body?.email || undefined
    });

    return json({ url: session.url });
  } catch (err) {
    console.error('createCheckoutSession error:', err);
    return json({ error: String(err?.message || err) }, 500);
  }
};

// Small helper
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

