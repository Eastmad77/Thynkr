// netlify/functions/webhook.js
// Generic webhook sink for testing third-party callbacks.
const json = (statusCode, data, headers = {}) => ({
  statusCode,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(data),
});
const allowOrigin = (event) => event.headers.origin || "*";
const cors = (event, extra = {}) => ({
  "Access-Control-Allow-Origin": allowOrigin(event),
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  ...extra,
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors(event) };
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" }, cors(event));
  try {
    const payload = JSON.parse(event.body || "{}");
    console.log("[webhook] received", payload);
    return json(200, { ok: true }, cors(event));
  } catch (e) {
    return json(400, { error: "Invalid JSON" }, cors(event));
  }
}
