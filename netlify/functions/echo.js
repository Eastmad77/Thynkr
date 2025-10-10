export default async (req) => {
  const info = {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  };
  if (req.method !== "GET") {
    try { info.body = await req.json(); } catch {}
  }
  return Response.json(info, { headers: { "Cache-Control": "no-store" } });
};
