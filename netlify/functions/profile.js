const json = (s, d, h = {}) => ({ statusCode: s, headers: { "content-type": "application/json", ...h }, body: JSON.stringify(d) });
const allowOrigin = (e) => e.headers.origin || "*";
const cors = (e) => ({ "Access-Control-Allow-Origin": allowOrigin(e), "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" });

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
