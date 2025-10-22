// netlify/functions/get-daily-questions.js
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(event), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method Not Allowed' }, cors(event));
  }
  try {
    const today = new Date().toISOString().slice(0,10);
    return json(200, { date: today, questions: [] }, cors(event));
  } catch (err) {
    console.error('get-daily-questions error', err);
    return json(500, { error: 'Internal error' }, cors(event));
  }
}
const json = (s, d, h = {}) => ({ statusCode: s, headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(d) });
const cors = (e) => ({ 'Access-Control-Allow-Origin': e.headers?.origin || '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
