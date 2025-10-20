const json = (s, d, h = {}) => ({ statusCode: s, headers: { "content-type": "application/json", ...h }, body: JSON.stringify(d) });
const allowOrigin = (e) => e.headers.origin || "*";
const cors = (e) => ({ "Access-Control-Allow-Origin": allowOrigin(e), "Access-Control-Allow-Headers": "authorization,content-type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" });

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors(event) };
  const body = event.body ? JSON.parse(event.body) : null;
  return json(200, { ok: true, method: event.httpMethod, body }, cors(event));
}
