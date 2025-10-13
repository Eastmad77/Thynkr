// Simple health/version endpoint for in-app status panel
export default async () => {
  const version = '7000';
  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
  const hasPrice = !!process.env.STRIPE_PRICE_ID;

  return new Response(JSON.stringify({
    app: 'whylee',
    version,
    stripeConfigured: hasStripeKey && hasPrice
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
};
