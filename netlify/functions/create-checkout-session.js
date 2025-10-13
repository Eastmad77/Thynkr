/**
 * Create a new Stripe Checkout session for a 3-day trial + subscription
 * Runs as Netlify Function
 */

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

export const handler = async (event) => {
  try {
    const origin = event.headers.origin;
    const successUrl = `${origin}/?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/pro.html?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID, // your priced plan ID
          quantity: 1
        }
      ],
      subscription_data: {
        trial_period_days: 3
      },
      metadata: {
        origin
      },
      success_url: successUrl,
      cancel_url: cancelUrl
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    console.error('createCheckoutSession error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
