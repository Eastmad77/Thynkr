// ============================================================================
// Netlify Function: Stripe Webhook (subscription lifecycle events)
// ----------------------------------------------------------------------------
// Set these in Netlify → Site settings → Environment:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET
//
// Add this endpoint in Stripe Dashboard → Developers → Webhooks:
//   https://<your-site>/.netlify/functions/stripe/webhook
//
// IMPORTANT (Netlify):
// - Webhooks must receive the RAW request body. Netlify Functions do.
// - Do NOT JSON.parse the body before signature verification.
// - If you use any 3rd-party body parsers, disable them for this function.
//
// Optional: persist to Firestore or your DB in the TODO sections.
// ============================================================================

export const config = {
  path: "/.netlify/functions/stripe/webhook"
};

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20'
    });

    const sig = req.headers.get('stripe-signature');
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !whSecret) {
      return new Response('Missing signature/secret', { status: 400 });
    }

    // Get raw body (no JSON parse before verification)
    const buf = await req.arrayBuffer();
    let event;
    try {
      event = stripe.webhooks.constructEvent(Buffer.from(buf), sig, whSecret);
    } catch (err) {
      console.error('[stripe] Invalid webhook signature:', err);
      return new Response('Invalid signature', { status: 400 });
    }

    // ---- Handle key events --------------------------------------------------
    switch (event.type) {
      case 'checkout.session.completed': {
        // Fires when a customer completes Checkout
        const session = event.data.object;
        // session.mode === 'subscription'
        // session.customer, session.subscription, session.metadata.userId
        // TODO: mark provisional Pro access (trial/active) for this user
        // await writeEntitlement({ userId: session.metadata?.userId, status: 'pro' });
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const status = sub.status; // 'trialing' | 'active' | 'past_due' | 'canceled' | ...
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;
        const priceId = sub.items?.data?.[0]?.price?.id || null;
        const customerId = sub.customer;

        // TODO: upsert subscription doc
        // await writeSubscription({ customerId, status, trialEnd, priceId, subId: sub.id });

        // TODO: map to app user if you store mapping customerId -> userId
        // await writeEntitlement({ customerId, status: status === 'active' || status === 'trialing' ? 'pro' : 'free' });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const customerId = sub.customer;
        // TODO: downgrade
        // await writeEntitlement({ customerId, status: 'free' });
        break;
      }

      // Optionally handle:
      // - invoice.payment_failed
      // - invoice.payment_succeeded
      // - customer.subscription.trial_will_end
      default:
        // No action for other events
        break;
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Webhook error', { status: 500 });
  }
};
