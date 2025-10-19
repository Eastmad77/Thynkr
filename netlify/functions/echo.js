// netlify/functions/echo.js
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
  const body = event.body ? JSON.parse(event.body) : null;
  return json(200, { ok: true, method: event.httpMethod, body }, cors(event));
}
