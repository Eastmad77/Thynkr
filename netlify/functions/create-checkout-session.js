// Netlify Function: createCheckoutSession
// Env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID
import Stripe from 'stripe';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { STRIPE_SECRET_KEY, STRIPE_PRICE_ID } = process.env;
    if (!STRIPE_SECRET_KEY || !STRIPE_PRICE_ID) throw new Error('Stripe env missing');

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const body = JSON.parse(event.body || '{}');
    const { customer_email } = body;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      customer_email,
      success_url: `${event.headers.origin || 'https://dailybrainbolt.com'}/pro.html?status=success`,
      cancel_url: `${event.headers.origin || 'https://dailybrainbolt.com'}/pro.html?status=cancel`,
      subscription_data: {
        trial_period_days: 3
      }
    });

    return { statusCode: 200, headers, body: JSON.stringify({ id: session.id, url: session.url }) };
  } catch (err) {
    console.error('createCheckoutSession error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error' }) };
  }
}
