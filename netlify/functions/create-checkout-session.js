// Diagnostic version: creates a Stripe Checkout Session and surfaces clear errors.

const allowedOrigins = [
  process.env.SITE_URL,
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

  // Parse body safely
  let body = {};
  try { body = event.body ? JSON.parse(event.body) : {}; }
  catch { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON body" }) }; }

  const plan = String(body.plan || "").toLowerCase();
  const uid  = String(body.uid  || "");

  // Explicit env checks so we don't get a vague "Server Error"
  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }) };
  }
  if (!process.env.STRIPE_PRICE_MONTHLY || !process.env.STRIPE_PRICE_YEARLY) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Missing STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY" }) };
  }

  const priceMap = {
    monthly: process.env.STRIPE_PRICE_MONTHLY,
    yearly:  process.env.STRIPE_PRICE_YEARLY,
  };
  const price = priceMap[plan];

  if (!plan || !price) {
    return {
      statusCode: 400,
      headers: cors,
      body: JSON.stringify({
        error: "No price for selected plan",
        receivedPlan: plan,
        haveMonthly: !!priceMap.monthly,
        haveYearly: !!priceMap.yearly
      })
    };
  }

  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    const site = process.env.SITE_URL || "http://localhost:8888";
    const successUrl = `${site}/pro.html?checkout=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${site}/pro.html?checkout=cancel&plan=${plan}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_creation: "if_required",
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { uid, plan, site }
    });

    return {
      statusCode: 200,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, id: session.id })
    };
  } catch (err) {
    console.error("create-checkout-session error:", err?.message, err?.raw?.message);
    return {
      statusCode: 500,
      headers: { ...cors, "Content-Type": "application/json" },
      body: JSON.stringify({ error: err?.raw?.message || err?.message || "Server Error" })
    };
  }
};
