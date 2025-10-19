// netlify/functions/status.js
const json = (statusCode, data, headers = {}) => ({
  statusCode,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(data),
});

export async function handler() {
  return json(200, {
    ok: true,
    env: {
      NODE_ENV: process.env.NODE_ENV || "production",
      STRIPE: !!process.env.STRIPE_SECRET_KEY,
      FIREBASE_ADMIN: !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.FIREBASE_PRIVATE_KEY
    },
    version: "v9"
  });
}
