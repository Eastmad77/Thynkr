// ============================================================================
// Netlify Function: Simple health/version endpoint for Whylee
// Used by in-app status panel or for quick diagnostics.
// ----------------------------------------------------------------------------
// Returns:
//   {
//     "app": "whylee",
//     "version": "7000",
//     "stripeConfigured": true|false,
//     "timestamp": "ISO-8601"
//   }
// ============================================================================

export default async () => {
  const version = '7000'; // bump when you ship
  const stripeConfigured = !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

  return new Response(JSON.stringify({
    app: 'whylee',
    version,
    stripeConfigured,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
};
