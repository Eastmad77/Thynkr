const json = (s, d) => ({ statusCode: s, headers: { "content-type": "application/json" }, body: JSON.stringify(d) });

export async function handler() {
  return json(200, {
    ok: true,
    env: {
      NODE_ENV: process.env.NODE_ENV || "production",
      STRIPE: !!process.env.STRIPE_SECRET_KEY,
      FIREBASE_ADMIN: !!process.env.FIREBASE_PROJECT_ID && !!process.env.FIREBASE_CLIENT_EMAIL && !!process.env.FIREBASE_PRIVATE_KEY
    },
    version: "v9"
  });
}
