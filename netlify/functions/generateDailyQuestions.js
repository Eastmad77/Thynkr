const json = (s, d) => ({ statusCode: s, headers: { "content-type": "application/json" }, body: JSON.stringify(d) });

export async function handler() {
  return json(200, { ok: true, generated: 10, at: new Date().toISOString() });
}
