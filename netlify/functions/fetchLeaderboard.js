// netlify/functions/fetchLeaderboard.js
export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(event), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Method Not Allowed' }, cors(event));
  }
  try {
    // If you have Firestore wired, plug it here. For now, return demo payload.
    const demo = [
      { uid: 'u1', name: 'Player 1', xp: 1200, streak: 5, rank: 1, tier: 'free' }
    ];
    return json(200, demo, cors(event));
  } catch (err) {
    console.error('fetchLeaderboard error', err);
    return json(500, { error: 'Internal error' }, cors(event));
  }
}

const json = (s, d, h = {}) => ({
  statusCode: s,
  headers: { 'content-type': 'application/json; charset=utf-8', ...h },
  body: JSON.stringify(d),
});
const cors = (e) => ({
  'Access-Control-Allow-Origin': e.headers?.origin || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});
