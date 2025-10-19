// netlify/functions/profile.js
// GET/POST a lightweight profile structure. Replace with Firestore logic later.
const json = (statusCode, data, headers = {}) => ({
  statusCode,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(data),
});
const allowOrigin = (event) => event.headers.origin || "*";
const cors = (event, extra = {}) => ({
  "Access-Control-Allow-Origin": allowOrigin(event),
  "Access-Control-Allow-Headers": "authorization,content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  ...extra,
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors(event) };

  if (event.httpMethod === "GET") {
    return json(200, { displayName: "Whylee Player", emoji: "🦊", xp: 1200 }, cors(event));
  }
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      // TODO: persist to Firestore after verifying auth
      return json(200, { ok: true, saved: body }, cors(event));
    } catch {
      return json(400, { error: "Invalid JSON" }, cors(event));
    }
  }
  return json(405, { error: "Method Not Allowed" }, cors(event));
}
