// POST → Stripe Checkout URL for Whylee Pro
export default async (req) => {
  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });

  try {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return Response.json({ error: "Missing STRIPE_SECRET_KEY" }, { status: 500 });
    }

    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

    const origin = req.headers.get("origin") || "https://dailybrainbolt.com";
    const price = process.env.STRIPE_PRICE_ID || "price_123";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      success_url: `${origin}/pro.html?status=success`,
      cancel_url: `${origin}/pro.html?status=cancel`,
      metadata: { app: "whylee" },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
};
