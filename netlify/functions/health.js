export default async () => {
  return Response.json({
    ok: true,
    name: "whylee",
    ts: Date.now(),
    versions: {
      sw: "6006",
      api: "1.0"
    }
  }, { headers: { "Cache-Control": "no-store" } });
};
