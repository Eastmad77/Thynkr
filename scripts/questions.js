// scripts/questions.js — v7000 autonomous loader
const DAILY_COLLECTION = 'daily_questions';
const LS_KEY = 'whylee:lastQuestions';

function todayISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString().slice(0,10);
}

async function waitForDb(ms = 3000) {
  if (window.WHYLEE_DB) return window.WHYLEE_DB;
  return new Promise(res => {
    const onReady = () => { window.removeEventListener('whylee:db-ready', onReady); res(window.WHYLEE_DB || null); };
    window.addEventListener('whylee:db-ready', onReady);
    setTimeout(() => res(window.WHYLEE_DB || null), ms);
  });
}

async function fetchFromFirestore(dateStr) {
  const db = await waitForDb();
  if (!db) throw new Error('Firestore not ready');
  const isCompat = !!(window.firebase && db.collection);
  if (isCompat) {
    const snap = await db.collection(DAILY_COLLECTION).doc(dateStr).get();
    if (!snap.exists) throw new Error('No doc ' + dateStr);
    return snap.data();
  } else {
    const { doc, getDoc, collection } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js');
    const ref = doc(collection(db, DAILY_COLLECTION), dateStr);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('No doc ' + dateStr);
    return snap.data();
  }
}

function saveCache(payload) { try { localStorage.setItem(LS_KEY, JSON.stringify(payload)); } catch {} }
function loadCache() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; } }

async function fetchCsvFallback() {
  try {
    const res = await fetch('/media/questions/daily.csv', { cache: 'no-store' });
    if (!res.ok) throw new Error('CSV not found');
    const text = await res.text();
    const rows = text.trim().split(/\r?\n/); const header = rows.shift().split(',');
    const idx = {
      Level: header.indexOf('Level'),
      Question: header.indexOf('Question'),
      Answers: header.indexOf('Answers'),
      CorrectIndex: header.indexOf('CorrectIndex')
    };
    const levelsMap = { 1: [], 2: [], 3: [] };
    for (const line of rows) {
      const cols = line.split(',');
      const lvl = Number(cols[idx.Level] || 1);
      const q   = String(cols[idx.Question] || '').trim();
      const ans = String(cols[idx.Answers] || '').split('|').map(s => s.trim());
      const ci  = Number(cols[idx.CorrectIndex] || 0);
      if (q && ans.length >= 3) levelsMap[lvl]?.push({ question: q, choices: ans, correctIndex: ci });
    }
    const payload = {
      date: todayISO(),
      levels: [
        { level: 1, items: levelsMap[1] || [] },
        { level: 2, items: levelsMap[2] || [] },
        { level: 3, items: levelsMap[3] || [] }
      ],
      version: 7000
    };
    saveCache(payload);
    return payload;
  } catch (e) {
    console.warn('CSV fallback failed', e);
    return null;
  }
}

export async function loadQuestionsForToday() {
  const today = todayISO();
  try {
    const data = await fetchFromFirestore(today);
    if (data?.levels?.length) { saveCache(data); return data; }
  } catch (e) {
    console.info('Firestore fail → cache', e?.message || e);
  }
  const cached = loadCache();
  if (cached?.levels?.length) return cached;
  const csv = await fetchCsvFallback();
  if (csv) return csv;
  return { date: today, levels: [{level:1, items:[{question:'Fallback Q1', choices:['A','B','C','D'], correctIndex:0}]},{level:2,items:[]},{level:3,items:[]}], version:7000 };
}
