// netlify/functions/webhook.js
const json = (s, d, h = {}) => ({ statusCode: s, headers: { 'content-type': 'application/json; charset=utf-8', ...h }, body: JSON.stringify(d) });
const cors = (e) => ({ 'Access-Control-Allow-Origin': e.headers?.origin || '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors(event), body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' }, cors(event));
  try {
    const payload = JSON.parse(event.body || '{}');
    console.log('[webhook] keys:', Object.keys(payload));
    return json(200, { ok: true }, cors(event));
  } catch {
    return json(400, { error: 'Invalid JSON' }, cors(event));
  }
}
