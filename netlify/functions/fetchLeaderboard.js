import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

function ensureAdmin() {
  if (getApps().length) return;
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Missing Firebase Admin env vars.');
  }
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
  });
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    ensureAdmin();
    const db = getFirestore();

    const COL = process.env.LEADERBOARD_COLLECTION || 'leaderboard';
    const LIMIT = Math.min(Number(process.env.LEADERBOARD_LIMIT || 100), 500);

    const snap = await db.collection(COL)
      .orderBy('xp', 'desc')
      .orderBy('streak', 'desc')
      .limit(LIMIT)
      .get();

    const rows = [];
    snap.forEach((doc) => {
      const d = doc.data() || {};
      rows.push({
        uid: doc.id,
        name: d.name ?? 'Player',
        tier: (d.tier ?? 'free').toLowerCase(),
        xp: Number(d.xp ?? 0),
        streak: Number(d.streak ?? 0),
        avatarSrc: d.avatarSrc ?? '/media/avatars/profile-default.svg',
        badge: d.badge ?? null
      });
    });

    const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));
    return { statusCode: 200, headers: CORS, body: JSON.stringify(ranked) };
  } catch (err) {
    console.error('[fetch-leaderboard] error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal error' }) };
  }
}
