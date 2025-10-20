// netlify/functions/get-daily-questions.js
// GET → returns today's questions from Firestore if available, else CSV fallback.
// Query: ?tz=UTC&day=YYYY-MM-DD
// Uses shared Firebase Admin singleton.

import { getAdmin } from './_shared/firebase-admin.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

function dayKeyNow(tz = 'UTC') {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
}

async function csvFallback() {
  try {
    // read from repo at build/bundle time
    const url = new URL('../../media/questions/sample-questions.csv', import.meta.url);
    const text = await (await fetch(url)).text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const [header, ...rows] = lines;
    const cols = header.split(',').map((s) => s.trim());

    return rows.slice(0, 36).map((r) => {
      const vals = r.split(',').map((s) => s.trim());
      const obj = Object.fromEntries(cols.map((c, i) => [c, vals[i] ?? '']));
      return {
        Question: obj.Question || obj.Prompt || 'Question?',
        Answers: [obj.OptionA, obj.OptionB, obj.OptionC, obj.OptionD].filter(Boolean),
        CorrectIndex: Number.isFinite(Number(obj.Answer)) ? Number(obj.Answer) : 0,
        Explanation: obj.Explanation || '',
        Level: Number(obj.Level || 1),
        Category: obj.Category || 'General',
        Difficulty: obj.Difficulty || 'easy',
        ID: obj.ID || crypto.randomUUID(),
      };
    });
  } catch (e) {
    console.error('[get-daily-questions] CSV fallback failed', e);
    return [];
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const url = new URL(event.rawUrl || `${event.headers.origin || 'https://example.com'}${event.path}${event.rawQuery ? '?' + event.rawQuery : ''}`);
    const tz = url.searchParams.get('tz') || 'UTC';
    const dayKey = url.searchParams.get('day') || dayKeyNow(tz);

    const { db, using } = getAdmin();

    if (using && db) {
      // You can switch this collection name to match your production shape.
      // Using 'daily_sets' → { items: [...] }
      const snap = await db.collection('daily_sets').doc(dayKey).get();
      if (snap.exists) {
        const data = snap.data() || {};
        return { statusCode: 200, headers: CORS, body: JSON.stringify({ dayKey, source: 'firebase', items: data.items || [] }) };
      }
    }

    const items = await csvFallback();
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ dayKey, source: 'csv', items }) };
  } catch (err) {
    console.error('[get-daily-questions] error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal error' }) };
  }
}
