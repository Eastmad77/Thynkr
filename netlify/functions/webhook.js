// Generic webhook endpoint (ESM). CORS + JSON, no secrets logged.
// If you later add provider-specific validation (e.g., HMAC), do it here.

const json = (code, data, extraHeaders = {}) => ({
  statusCode: code,
  headers: { "content-type": "application/json", ...extraHeaders },
  body: JSON.stringify(data),
});

const corsHeaders = (event) => ({
  "Access-Control-Allow-Origin": event.headers?.origin || "*",
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(event), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" }, corsHeaders(event));
  }

  try {
    // If you need Firebase here, import lazily:
    // const { db, using } = await import("./_shared/firebase-admin.mjs").then(m => m.getAdmin());
    // if (using) await db.collection("webhooks").add({ receivedAt: Date.now(), ...payload });

    const payload = JSON.parse(event.body || "{}");
    console.log("[webhook] received keys:", Object.keys(payload || {})); // safe, no secrets printed

    return json(200, { ok: true }, corsHeaders(event));
  } catch (err) {
    return json(400, { error: "Invalid JSON" }, corsHeaders(event));
  }
}
