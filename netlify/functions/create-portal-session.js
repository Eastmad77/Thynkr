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
    const { customerId, return_url } = JSON.parse(event.body || "{}");
    if (!customerId) return json(400, { error: "Missing customerId" }, cors(event));

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: return_url || `${event.headers.origin}/profile.html`,
    });

    return json(200, { url: session.url }, cors(event));
  } catch (e) {
    console.error("[create-portal-session] error:", e);
    return json(500, { error: e.message }, cors(event));
  }
}
