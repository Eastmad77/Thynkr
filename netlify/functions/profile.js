// netlify/functions/profile.js
// GET /.netlify/functions/profile?uid=abc → returns summarized profile stats.

import { getAdmin } from './_shared/firebase-admin.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const url = new URL(event.rawUrl || `${event.headers.origin || 'https://example.com'}${event.path}${event.rawQuery ? '?' + event.rawQuery : ''}`);
    const uid = url.searchParams.get('uid') || 'anon';

    const { db, using } = getAdmin();
    if (!(using && db)) {
      return { statusCode: 501, headers: CORS, body: JSON.stringify({ ok: false, message: 'Profiles unavailable (Firebase disabled).' }) };
    }

    const runsSnap = await db.collection('users').doc(uid).collection('runs')
      .orderBy('ts', 'desc').limit(500).get();

    let total = 0, correct = 0, days = new Set(), perfectLevels = 0, longestStreak = 0;
    let currentStreak = 0, prevDay = null;

    runsSnap.forEach((doc) => {
      const r = doc.data() || {};
      total += Number(r.totalAsked || 0);
      correct += Number(r.totalCorrect || 0);
      if (r.levelReached >= 3 && r.totalCorrect === r.totalAsked) perfectLevels++;

      const day = (r.dayKey || '').trim();
      if (day) {
        days.add(day);
        if (!prevDay) {
          currentStreak = 1;
        } else {
          const dt = new Date(prevDay); dt.setDate(dt.getDate() - 1);
          const expected = dt.toISOString().slice(0, 10);
          currentStreak = (day === expected) ? currentStreak + 1 : 1;
        }
        longestStreak = Math.max(longestStreak, currentStreak);
        prevDay = day;
      }
    });

    const accuracy = total ? Math.round((correct / total) * 100) : 0;

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        ok: true,
        uid,
        totals: { totalQuestions: total, correct, accuracy },
        perfectLevels,
        longestStreak,
        daysPlayed: days.size
      })
    };
  } catch (err) {
    console.error('[profile] error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal error' }) };
  }
}
