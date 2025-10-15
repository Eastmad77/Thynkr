// netlify/functions/generateDailyQuestions.js — v7000 (MCQ + Pairs + AdPoster)
const admin = require('firebase-admin');

const creds = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
};

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(creds) });
}
const db = admin.firestore();

function todayStr(d = new Date()) { return d.toISOString().slice(0, 10); }

function genMCQ(count, { category = 'logic', difficulty = 'easy' } = {}) {
  return Array.from({ length: count }).map((_, i) => ({
    question: `Sample ${category} Q${i + 1} (${difficulty}) — pick the correct option`,
    choices: ['Alpha', 'Beta', 'Gamma', 'Delta'],
    correctIndex: i % 4,
    category,
    difficulty
  }));
}

function genPairs(pairCount, { theme = 'synonyms' } = {}) {
  const basePairs = [
    ['Happy','Joyful'], ['Quick','Rapid'], ['Smart','Clever'],
    ['Begin','Start'], ['Silent','Quiet'], ['Big','Large'],
    ['Tiny','Small'], ['Angry','Mad'], ['Brave','Courageous'],
    ['Calm','Peaceful']
  ];
  const take = basePairs.slice(0, pairCount);
  return take.map(([left, right]) => ({ left, right, theme }));
}

function validatePayload(p) {
  if (!p?.levels || !Array.isArray(p.levels)) return false;
  for (const lvl of p.levels) {
    if (lvl.type === 'mcq') {
      if (!Array.isArray(lvl.items)) return false;
      for (const q of lvl.items) {
        if (typeof q.question !== 'string') return false;
        if (!Array.isArray(q.choices) || q.choices.length < 3) return false;
        if (typeof q.correctIndex !== 'number') return false;
      }
    } else if (lvl.type === 'pairs') {
      if (!Array.isArray(lvl.items)) return false;
      for (const pair of lvl.items) {
        if (typeof pair.left !== 'string' || typeof pair.right !== 'string') return false;
      }
    } else return false;
  }
  return true;
}

exports.handler = async () => {
  try {
    const today = todayStr();
    const ref = db.collection('daily_questions').doc(today);
    const snap = await ref.get();
    if (snap.exists) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'exists', date: today }) };
    }

    const adPool = [
      'poster-ad-sponsor.png',
      'poster-ad-energy.png',
      'poster-ad-upgrade.png'
    ];
    const adPoster = adPool[Math.floor(Math.random() * adPool.length)];

    const payload = {
      date: today,
      version: 7000,
      adPoster,
      levels: [
        { level: 1, type: 'mcq',   items: genMCQ(12, { category: 'warmup', difficulty: 'easy' }) },
        { level: 2, type: 'pairs', items: genPairs(6,  { theme: 'synonyms' }) },  // 6 pairs → 12 cards
        { level: 3, type: 'mcq',   items: genMCQ(12, { category: 'trivia', difficulty: 'medium' }) }
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (!validatePayload(payload)) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'validation_failed' }) };
    }

    await ref.set(payload);
    return { statusCode: 200, body: JSON.stringify({ ok: true, date: today, adPoster }) };
  } catch (e) {
    console.error('Daily generation failed:', e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: String(e) }) };
  }
};
