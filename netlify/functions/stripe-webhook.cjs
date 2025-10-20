// netlify/functions/stripe-webhook.cjs
// CommonJS version (required because package.json uses "type":"module")

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const rawBody = (event) => {
  // Netlify provides raw body in event.body for webhooks when using 'body: "stream"' bundler,
  // but esbuild default works fine for typical webhooks too.
  return event.body;
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const sig = event.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const body = rawBody(event);

    let evt;
    if (endpointSecret) {
      evt = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } else {
      // fallback for local testing only
      evt = JSON.parse(body);
    }

    // Handle events of interest
    switch (evt.type) {
      case 'checkout.session.completed': {
        // mark user pro, etc. usually via metadata.uid
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        break;
      }
      default:
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error('stripe-webhook error', err);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
};
