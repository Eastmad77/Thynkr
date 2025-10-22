// netlify/functions/status.js
export async function handler() {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ status: 'ok', env: 'netlify', ts: Date.now() }),
  };
}
