/**
 * questions.js — v7000
 * Loads daily questions from CSV (media/questions/*.csv) with fallback seed.
 * Exported API:
 *   loadQuestionsForToday() -> Promise<Question[]>
 *   type Question = { Question, Answers[], CorrectIndex, Explanation?, Level }
 */
const CSV_URL = '/media/questions/daily.csv'; // change to your pipeline or Sheets proxy
const FALLBACK_URL = '/media/questions/sample-questions.csv';

export async function loadQuestionsForToday() {
  // Try daily.csv, then fallback, then seed
  const csv = await tryFetchText(CSV_URL)
    .catch(()=> tryFetchText(FALLBACK_URL))
    .catch(()=> null);

  if (csv) {
    const rows = parseCSV(csv);
    const items = rowsToQuestions(rows);
    return normalize36(items);
  }

  // Seed (36 sample)
  return seed36();
}

// ------- helpers
async function tryFetchText(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('fetch failed');
  return res.text();
}

function parseCSV(text) {
  // naive CSV (no embedded commas/quotes handling)
  const lines = text.trim().split(/\r?\n/);
  const head = lines.shift().split(',');
  return lines.map(line => {
    const cols = splitCsv(line);
    const row = {};
    head.forEach((h, i) => row[h.trim()] = (cols[i] || '').trim());
    return row;
  });
}
function splitCsv(line){
  // basic CSV splitter honoring quotes
  const out = []; let cur = '', inQ = false;
  for (let i=0;i<line.length;i++){
    const c = line[i];
    if (c === '"' ) { inQ = !inQ; continue; }
    if (c === ',' && !inQ){ out.push(cur); cur=''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

function rowsToQuestions(rows){
  return rows.map((r,i) => {
    const opts = [r.OptionA, r.OptionB, r.OptionC, r.OptionD].filter(Boolean);
    const correct = String(r.Answer || 'A').toUpperCase().charCodeAt(0) - 65; // A->0
    const level = Number(r.Level || (i<12?1:(i<24?2:3)));
    return {
      Question: r.Question || `Question ${i+1}?`,
      Answers: opts.length ? opts : [`Correct ${i+1}`, 'Alt A', 'Alt B', 'Alt C'],
      CorrectIndex: isFinite(correct) ? correct : 0,
      Explanation: r.Explanation || '',
      Level: level
    };
  });
}

function normalize36(items){
  // ensure exactly 36 (12 per level), pad or trim
  const perLevel = 12;
  const out = [];
  [1,2,3].forEach(lv => {
    const pool = items.filter(q=>q.Level===lv).slice(0, perLevel);
    while (pool.length < perLevel) {
      pool.push({
        Question: `Sample question (L${lv}) #${pool.length+1}?`,
        Answers: ['Correct','Alt A','Alt B','Alt C'],
        CorrectIndex: 0,
        Explanation: '',
        Level: lv
      });
    }
    out.push(...pool);
  });
  return out;
}

function seed36(){
  const items = [];
  for (let i=0;i<36;i++){
    items.push({
      Question: `Sample question #${i+1}?`,
      Answers: ['Correct', 'Alt A', 'Alt B', 'Alt C'],
      CorrectIndex: 0,
      Explanation: `Short explanation for question ${i+1}.`,
      Level: i<12?1:(i<24?2:3)
    });
  }
  return items;
}
