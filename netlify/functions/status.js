export async function handler() {
  const body = {
    ok: true,
    app: 'Whylee',
    version: 'v7006',
    time: new Date().toISOString()
  };
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(body)
  };
}
