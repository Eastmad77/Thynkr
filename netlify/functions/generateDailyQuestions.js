// netlify/functions/generateDailyQuestions.js
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(event), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' }, cors(event));
  }
  try {
    // stub generation
    const { date = new Date().toISOString().slice(0,10) } = JSON.parse(event.body || '{}');
    return json(200, { ok: true, date, count: 10 }, cors(event));
  } catch (err) {
    console.error('generateDailyQuestions error', err);
    return json(500, { error: 'Internal error' }, cors(event));
  }
}
const json = (s, d, h = {}) => ({ statusCode: s, headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(d) });
const cors = (e) => ({ 'Access-Control-Allow-Origin': e.headers?.origin || '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
