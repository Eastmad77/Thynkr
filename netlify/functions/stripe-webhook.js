import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

const json = (status, data, headers = {}) => ({
  statusCode: status,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(data),
});
const allowOrigin = (evt) => evt.headers.origin || "*";
const cors = (evt, extra = {}) => ({
  "Access-Control-Allow-Origin": allowOrigin(evt),
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  ...extra,
});
const rawBuffer = (evt) =>
  evt.isBase64Encoded ? Buffer.from(evt.body || "", "base64") : Buffer.from(evt.body || "");

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors(event) };
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" }, cors(event));

  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) return json(500, { error: "Missing STRIPE_WEBHOOK_SECRET" }, cors(event));

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBuffer(event), sig, whSecret);
  } catch (e) {
    console.error("[stripe-webhook] signature error:", e.message);
    return json(400, { error: `Webhook Error: ${e.message}` }, cors(event));
  }

  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;
        const uid = session?.metadata?.uid;
        const sku = session?.metadata?.sku || "pro";
        console.log("[stripe-webhook] checkout.session.completed", { uid, sku, id: session.id });
        // TODO: mark users/{uid}.pro = true in Firestore
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object;
        console.log("[stripe-webhook] subscription", { id: sub.id, status: sub.status });
        // TODO: sync entitlement
        break;
      }
      default:
        console.log("[stripe-webhook] unhandled:", stripeEvent.type);
    }
  } catch (e) {
    console.error("[stripe-webhook] handler error:", e);
    return json(500, { error: "Webhook handler error" }, cors(event));
  }

  return json(200, { received: true }, cors(event));
}
