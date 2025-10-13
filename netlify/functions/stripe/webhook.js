/**
 * Stripe Webhook handler for subscription events
 * Use endpoint URL from Stripe dashboard
 */

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

export const handler = async (event) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, event.headers['stripe-signature'], secret);
  } catch (err) {
    console.error('Webhook signature verification failed', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const { type, data } = stripeEvent;

  if (type === 'checkout.session.completed') {
    const session = data.object;
    // TODO: write subscription details to your Firestore or DB
    console.log('Subscription started:', session.id, session.metadata.origin);
  }
  else if (type === 'customer.subscription.deleted') {
    const sub = data.object;
    // TODO: remove pro from user entitlements
    console.log('Subscription canceled:', sub.id);
  }

  return { statusCode: 200, body: 'OK' };
};
