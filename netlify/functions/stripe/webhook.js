// Netlify Function: Stripe Webhook (subscriptions lifecycle)
// ENV required:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET
//
// Add this route as the Stripe endpoint, e.g.:
//   https://<your-site>/.netlify/functions/stripe/webhook
//
// IMPORTANT: In Netlify, set "Body" passthrough: keep the raw body.
// In netlify.toml add:
// [functions]
//   node_bundler = "esbuild"
//   included_files = []
// [functions."stripe/webhook"]
//   external_node_modules = ["stripe"]

export const config = { path: "/.netlify/functions/stripe/webhook" };

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    // Netlify provides raw body on req.body for functions (no auto-JSON)
    const sig = req.headers.get('stripe-signature');
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !whSecret) return new Response('Missing signature or secret', { status: 400 });

    const buf = await req.arrayBuffer();
    let event;
    try {
      event = stripe.webhooks.constructEvent(Buffer.from(buf), sig, whSecret);
    } catch (err) {
      console.error('Invalid webhook signature', err);
      return new Response('Invalid signature', { status: 400 });
    }

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // TODO: mark user as provisional pro (trial or active)
        // await writeEntitlement({ userId: session.metadata?.userId, status: 'pro_trial_or_active' });
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        // Extract status/trial_end
        const status = sub.status; // 'trialing' | 'active' | 'past_due' | ...
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        // TODO: write to your DB / Firestore here:
        // await writeSubscription({ customerId: sub.customer, status, trialEnd, price: sub.items?.data?.[0]?.price?.id });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        // TODO: downgrade entitlement
        // await writeEntitlement({ customerId: sub.customer, status: 'free' });
        break;
      }
      default:
        // no-op
        break;
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('webhook error:', err);
    return new Response('Webhook error', { status: 500 });
  }
};
