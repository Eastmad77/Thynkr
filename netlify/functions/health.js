// netlify/functions/health.js
export async function handler() {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ ok: true, service: 'whylee', ts: Date.now() }),
  };
}
