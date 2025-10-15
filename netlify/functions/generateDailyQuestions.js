// Netlify Function: generateDailyQuestions (daily CRON)
// netlify.toml cron: "0 5 * * *" to run daily at 05:00 UTC (adjust as needed)
// Writes to: Firestore collection 'daily_questions/{YYYY-MM-DD}'
// Env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'node:fs';
import path from 'node:path';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

function adminInit() {
  if (getApps().length) return;
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) throw new Error('Missing Firebase Admin envs');
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0,10); // YYYY-MM-DD
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  try {
    adminInit();
    const db = getFirestore();
    const key = todayKey();
    const docRef = db.collection('daily_questions').doc(key);

    // If already exists, just return it
    const existing = await docRef.get();
    if (existing.exists) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, existed: true }) };
    }

    // Try to load seed CSV from repo
    const csvPath = path.join(process.cwd(), 'media', 'questions', 'daily.csv');
    let payload = null;

    if (fs.existsSync(csvPath)) {
      const csv = fs.readFileSync(csvPath, 'utf8');
      payload = buildFromCSV(csv);
    }

    // Fallback: synthesize minimal set
    if (!payload) payload = synthesizeFallback();

    // Write Firestore
    await docRef.set(payload, { merge: false });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, created: key }) };
  } catch (err) {
    console.error('generateDailyQuestions error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal error' }) };
  }
}

function buildFromCSV(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines.shift().split(',').map(s => s.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);

  const out = { date: todayKey(), levels: [] };
  const lv1 = [], lv2 = [], lv3 = [];

  for (const line of lines) {
    const cols = parseCSVLine(line);
    const level = Number(cols[idx('level')] || '1');
    const type = (cols[idx('type')] || 'mcq').toLowerCase();
    const question = cols[idx('question')] || '';
    const a1 = cols[idx('answer1')] || '';
    const a2 = cols[idx('answer2')] || '';
    const a3 = cols[idx('answer3')] || '';
    const a4 = cols[idx('answer4')] || '';
    const pairs = cols[idx('pairs')] || '';

    if (level === 2 && type === 'pairs') {
      const pairList = pairs.split(';').map(p => p.trim()).filter(Boolean).map(p => {
        const [t, m] = p.split('|').map(s => (s || '').trim());
        return { term: t, match: m };
      });
      lv2.push({ Level: 2, Type: 'pairs', Pairs: pairList.slice(0, 6) });
    } else {
      const answers = [a1, a2, a3, a4].filter(Boolean);
      if (answers.length >= 2) {
        lv1.push({ Level: 1, Type: 'mcq', Question: question, Answers: answers });
        lv3.push({ Level: 3, Type: 'mcq', Question: question, Answers: answers });
      }
    }
  }

  // take 12 each (or synthesize to fill)
  out.levels = [
    ...padTo(lv1, 12, synthMCQ),
    ...padTo(lv2, 12, synthPAIRS),
    ...padTo(lv3, 12, synthMCQ)
  ];
  // Optional sponsor/ad placement for free tier surface
  out.adPoster = pick(['poster-reward', 'poster-levelup', 'poster-success']);

  return out;
}

function parseCSVLine(line) {
  // simple CSV parse (no embedded commas in quotes expected in our template)
  return line.split(',').map(s => s.trim());
}

function synthesizeFallback() {
  // minimal safe set
  const lv1 = Array.from({ length: 12 }, (_, i) => ({
    Level: 1, Type: 'mcq',
    Question: `Quick warm-up #${i+1}: 3 + ${i}?`,
    Answers: [`${3 + i}`, `${2 + i}`, `${4 + i}`, `${5 + i}`]
  }));
  const lv2 = Array.from({ length: 12 }, () => ({
    Level: 2, Type: 'pairs',
    Pairs: [
      { term: 'France', match: 'Paris' },
      { term: 'Japan', match: 'Tokyo' },
      { term: 'Canada', match: 'Ottawa' },
      { term: 'Brazil', match: 'Brasília' }
    ]
  }));
  const lv3 = Array.from({ length: 12 }, (_, i) => ({
    Level: 3, Type: 'mcq',
    Question: `Trivia check #${i+1}: Author of "1984"?`,
    Answers: ['George Orwell', 'Aldous Huxley', 'Ray Bradbury', 'Arthur C. Clarke']
  }));

  return {
    date: todayKey(),
    levels: [...lv1, ...lv2, ...lv3],
    adPoster: 'poster-reward'
  };
}

function padTo(arr, n, synthFn) {
  const out = arr.slice(0, n);
  while (out.length < n) out.push(synthFn(out.length));
  return out;
}

function synthMCQ(i = 0) {
  return {
    Level: 1, Type: 'mcq',
    Question: `Warm-up ${i+1}: 5 × 5 = ?`,
    Answers: ['25', '20', '30', '15']
  };
}

function synthPAIRS() {
  return {
    Level: 2, Type: 'pairs',
    Pairs: [
      { term: 'Mercury', match: 'Planet' },
      { term: 'Jupiter', match: 'Gas Giant' },
      { term: 'Mars', match: 'Red Planet' }
    ]
  };
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}
