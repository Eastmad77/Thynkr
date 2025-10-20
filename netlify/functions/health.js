const started = Date.now();
const json = (s, d) => ({ statusCode: s, headers: { "content-type": "application/json" }, body: JSON.stringify(d) });

export async function handler() {
  const now = Date.now();
  return json(200, { ok: true, service: "whylee", uptimeSec: Math.round((now - started) / 1000), timestamp: new Date(now).toISOString() });
}
