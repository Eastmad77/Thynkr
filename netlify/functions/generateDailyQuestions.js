// netlify/functions/generateDailyQuestions.js
// CRON-safe: create daily set once. Writes to 'daily_sets/{YYYY-MM-DD}'.
// Optionally seeds from /media/questions/daily.csv.

import fs from 'node:fs';
import path from 'node:path';
import { getAdmin } from './_shared/firebase-admin.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function buildFromCSV(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = (lines.shift() || '').split(',').map((s) => s.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);

  const items = [];
  for (const line of lines) {
    const vals = line.split(',').map((s) => s.trim());
    const obj = Object.fromEntries(header.map((h, i) => [h, vals[i] ?? '']));

    items.push({
      Question: obj.question || 'Question?',
      Answers: [obj.optiona, obj.optionb, obj.optionc, obj.optiond].filter(Boolean),
      CorrectIndex: Number.isFinite(Number(obj.answer)) ? Number(obj.answer) : 0,
      Explanation: obj.explanation || '',
      Level: Number(obj.level || 1),
      Category: obj.category || 'General',
      Difficulty: obj.difficulty || 'easy',
      ID: obj.id || crypto.randomUUID(),
    });
  }
  return { items };
}

function synthesizeFallback() {
  // Minimal placeholder set of 10 if CSV not present.
  const items = Array.from({ length: 10 }).map((_, i) => ({
    Question: `Sample question ${i + 1}?`,
    Answers: ['A', 'B', 'C', 'D'],
    CorrectIndex: i % 4,
    Explanation: '',
    Level: 1,
    Category: 'General',
    Difficulty: 'easy',
    ID: crypto.randomUUID(),
  }));
  return { items };
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };

  try {
    const { db, using } = getAdmin();
    if (!(using && db)) {
      return { statusCode: 501, headers: CORS, body: JSON.stringify({ error: 'Admin not configured' }) };
    }

    const key = todayKey();
    const ref = db.collection('daily_sets').doc(key);

    const existing = await ref.get();
    if (existing.exists) {
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, existed: true, key }) };
    }

    // Try CSV from repo
    const csvPath = path.join(process.cwd(), 'media', 'questions', 'daily.csv');
    let payload;
    if (fs.existsSync(csvPath)) {
      const csv = fs.readFileSync(csvPath, 'utf8');
      payload = buildFromCSV(csv);
    } else {
      payload = synthesizeFallback();
    }

    await ref.set(payload, { merge: false });
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, created: key }) };
  } catch (err) {
    console.error('[generateDailyQuestions] error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Internal error' }) };
  }
}
