const json = (s, d, h = {}) => ({ statusCode: s, headers: { "content-type": "application/json", ...h }, body: JSON.stringify(d) });
const allowOrigin = (e) => e.headers.origin || "*";
const cors = (e) => ({ "Access-Control-Allow-Origin": allowOrigin(e), "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "POST,OPTIONS" });

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors(event) };
  if (event.httpMethod !== "POST") return json(405, { error: "Method Not Allowed" }, cors(event));
  try {
    const payload = JSON.parse(event.body || "{}");
    // TODO: verify auth, persist to Firestore
    return json(200, { ok: true, received: payload }, cors(event));
  } catch {
    return json(400, { error: "Invalid JSON" }, cors(event));
  }
}
