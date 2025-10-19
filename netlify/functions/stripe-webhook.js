// netlify/functions/stripe-webhook.js
// ESM version for "type": "module" packages

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const json = (statusCode, data, headers = {}) => ({
  statusCode,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(data),
});
const allowOrigin = (event) => event.headers.origin || "*";
const cors = (event, extra = {}) => ({
  "Access-Control-Allow-Origin": allowOrigin(event),
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  ...extra,
});

const rawBuffer = (event) =>
  event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : Buffer.from(event.body || "");

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors(event) };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" }, cors(event));
  }

  const signature = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET");
    return json(500, { error: "Server misconfigured" }, cors(event));
  }

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBuffer(event), signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature error:", err.message);
    return json(400, { error: `Webhook Error: ${err.message}` }, cors(event));
  }

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        // Example: read uid/sku from Checkout metadata
        const uid = session?.metadata?.uid;
        const sku = session?.metadata?.sku || "pro";
        console.log("[stripe-webhook] checkout.session.completed", { uid, sku, id: session.id });
        // TODO: mark user as Pro in Firestore (users/{uid}.pro = true)
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object;
        console.log("[stripe-webhook] subscription", { id: sub.id, status: sub.status });
        // TODO: sync entitlement by customer id
        break;
      }
      default:
        console.log("[stripe-webhook] unhandled event:", stripeEvent.type);
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return json(500, { error: "Webhook handler error" }, cors(event));
  }

  return json(200, { received: true }, cors(event));
}
