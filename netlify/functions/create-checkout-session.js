// Creates a Stripe Checkout Session for Brain Bolt Pro (monthly or yearly)
// POST body: { plan: "monthly" | "yearly", uid?: "firebaseAuthUid" }

const allowedOrigins = [
  process.env.SITE_URL,           // e.g. "https://admirable-medovik-b227d6.netlify.app"
  "http://localhost:8888",
  "http://localhost:5173"
];

exports.handler = async (event) => {
  const origin = event.headers.origin || "";
  const allow = allowedOrigins.filter(Boolean).includes(origin);
  const cors = {
    "Access-Control-Allow-Origin": allow ? origin : (process.env.SITE_URL || "*"),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };
  if (event.httpMethod !== "POST")   return { statusCode: 405, headers: cors, body: "Method Not Allowed" };

  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const body = event.body ? JSON.parse(event.body) : {};
    const plan = (body.plan || "").toLowerCase();   // "monthly" | "yearly"
    const uid  = body.uid || "";

    const priceMap = {
      monthly: process.env.STRIPE_PRICE_MONTHLY,
      yearly:  process.env.STRIPE_PRICE_YEARLY,
    };
    const price = priceMap[plan];
    if (!price) {
      return { statusCode: 400, headers: cors, body: "No price for selected plan" };
    }

    const site = process.env.SITE_URL || "http://localhost:8888";
    const successUrl = `${site}/pro.html?checkout=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${site}/pro.html?checkout=cancel&plan=${plan}`;

    // NOTE: removed customer_creation (only valid for payment mode)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { uid, plan, site }
    });

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, id: session.id }),
    };
  } catch (err) {
    console.error("create-checkout-session error:", err?.message || err);
    return { statusCode: 500, headers: cors, body: "Server Error" };
  }
};
