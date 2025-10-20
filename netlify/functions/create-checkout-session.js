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

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors(event) };
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" }, cors(event));

  try {
    const { uid, priceId, sku = "pro", success_url, cancel_url } = JSON.parse(event.body || "{}");
    if (!uid || !priceId) return json(400, { error: "Missing uid or priceId" }, cors(event));

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${event.headers.origin}/pro.html?status=success`,
      cancel_url: cancel_url || `${event.headers.origin}/pro.html?status=cancel`,
      metadata: { uid, sku }
    });

    return json(200, { id: session.id, url: session.url }, cors(event));
  } catch (e) {
    console.error("[create-checkout-session] error:", e);
    return json(500, { error: e.message }, cors(event));
  }
}
