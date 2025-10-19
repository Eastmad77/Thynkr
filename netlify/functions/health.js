// netlify/functions/health.js
const started = Date.now();

const json = (statusCode, data, headers = {}) => ({
  statusCode,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(data),
});

export async function handler() {
  const now = Date.now();
  return json(200, {
    ok: true,
    service: "whylee",
    uptimeSec: Math.round((now - started) / 1000),
    timestamp: new Date(now).toISOString()
  });
}
