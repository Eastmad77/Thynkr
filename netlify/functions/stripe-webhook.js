// netlify/functions/stripe-webhook.js (ESM)
// Node 18+, Netlify Functions. Works with "type": "module" in package.json.

import Stripe from "stripe";

// If deploying on Netlify, set these env vars in your site settings:
// - STRIPE_SECRET_KEY
// - STRIPE_WEBHOOK_SECRET
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

/**
 * Netlify sometimes base64-encodes the event body.
 */
function getRawBody(event) {
  if (!event || !event.body) return Buffer.from("");
  return event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body);
}

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!whSecret) {
    console.error("[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET");
    return { statusCode: 500, body: "Server misconfigured" };
  }

  let stripeEvent;
  try {
    const raw = getRawBody(event);
    stripeEvent = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err?.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle Stripe events you care about
  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        // Example: mark user as pro using metadata.uid (configure in Checkout)
        const session = stripeEvent.data.object;
        const uid = session?.metadata?.uid;
        const sku = session?.metadata?.sku || "pro";

        // TODO: persist entitlement in your DB (Firestore, etc.)
        console.log("[stripe-webhook] checkout.session.completed", { uid, sku });

        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object;
        // TODO: sync subscription status → entitlements
        console.log("[stripe-webhook] subscription event", {
          id: sub.id, status: sub.status,
        });
        break;
      }
      default:
        // Log and ignore other events
        console.log("[stripe-webhook] unhandled event:", stripeEvent.type);
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return { statusCode: 500, body: "Webhook handler error" };
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}
