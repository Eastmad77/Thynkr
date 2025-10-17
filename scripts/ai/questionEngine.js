/**
 * Whylee Question Engine (v8+)
 * - Supports MCQ and MATCH (now 5 pairs)
 * - Adaptive scoring and simple difficulty hooks
 *
 * API:
 *   const eng = await initQuestionEngine({ mode: "daily", count: 10 });
 *   const q = eng.next();                // returns { type, q, choices, answer } OR { type:'match', cards:[...] }
 *   const ok = eng.submit(index, ms);    // MCQ path
 *   const ok = eng.submitMatch({pairsFound, mistakes, seconds}); // MATCH summary path
 *   const r  = eng.results({ pro: boolean });
 *   const dbg= eng._debug();
 */

export async function initQuestionEngine(opts = {}) {
  const state = {
    count: Math.max(1, Number(opts.count || 10)),
    asked: 0,
    correct: 0,
    durationMs: 0,
    type: "daily",
    queue: [],
    current: null,
    // match-mode tracking (per round)
    match: null, // { targetPairs, found, mistakes, t0 }
  };

  // Build queue: MCQs + one MATCH round as Level 2
  const baseMcqs = await loadMCQs(6); // 6 MCQs
  const matchOne = buildMatchRound(5); // 5 pairs (10 cards)
  const moreMcqs = await loadMCQs(Math.max(0, state.count - (baseMcqs.length + 1)));

  state.queue = [
    ...baseMcqs.slice(0, 3),
    matchOne,
    ...baseMcqs.slice(3),
    ...moreMcqs,
  ].slice(0, state.count);

  return {
    next: () => next(state),
    submit: (choiceIndex, timeMs) => submit(state, choiceIndex, timeMs),
    submitMatch: (summary) => submitMatch(state, summary),
    results: ({ pro = false } = {}) => results(state, { pro }),
    _debug: () => ({ asked: state.asked, total: state.queue.length, type: state.type })
  };
}

// ----- Internal: queue ops ----------------------------------------------------
function next(state) {
  if (state.asked >= state.queue.length) return null;
  const item = state.queue[state.asked];
  state.current = item;

  if (item.type === "match") {
    // Start a match round timer
    state.match = {
      targetPairs: item.cards.length / 2,
      found: 0,
      mistakes: 0,
      t0: performance.now()
    };
    return item; // UI handles flips and summary → submitMatch()
  }
  return item; // MCQ item
}

function submit(state, choiceIndex, timeMs = 0) {
  const cur = state.current;
  if (!cur || cur.type !== "mcq") return false;

  const ok = Number(choiceIndex) === Number(cur.answer);
  if (ok) state.correct += 1;
  state.durationMs += Math.max(0, timeMs || 0);

  state.asked += 1;
  state.current = null;
  return ok;
}

function submitMatch(state, { pairsFound, mistakes, seconds } = {}) {
  // Called once when the match UI finishes the round
  const match = state.match || { targetPairs: 5 };
  const total = Number(pairsFound ?? match.targetPairs);
  const secs  = Number(seconds ?? Math.round((performance.now() - (match.t0 || performance.now()))/1000));
  const wrong = Math.max(0, Number(mistakes ?? 0));

  // treat "correct" as full completion
  if (total >= match.targetPairs) state.correct += 1;

  // store duration
  state.durationMs += Math.max(0, secs * 1000);

  state.asked += 1;
  state.current = null;
  state.match = null;

  // return compact score piece so caller can animate feedback if desired
  return {
    completed: total >= match.targetPairs,
    pairsFound: total,
    mistakes: wrong,
    seconds: secs
  };
}

// ----- Internal: scoring ------------------------------------------------------
function results(state, { pro }) {
  // base MCQ points ~10 each, match ~35 base, plus mild time bonus
  let xpEarned = 0;
  const mcqCount = state.queue.filter(q => q.type === "mcq").length;
  const matchCount = state.queue.filter(q => q.type === "match").length;

  // Grant per-correct MCQ
  const mcqCorrect = Math.max(0, state.correct - matchCount); // each match completion counts as 1 "correct"
  xpEarned += mcqCorrect * 10;

  // Grant per match round completed
  const matchCompleted = Math.min(matchCount, state.correct); // conservative
  xpEarned += matchCompleted * 35;

  // Time bonus: faster completions → small bonus (scaled)
  const secs = Math.max(0, Math.round(state.durationMs / 1000));
  const timeBonus = Math.max(0, Math.round((state.queue.length * 8 - secs) * 1.3));
  xpEarned += timeBonus;

  // Pro subtle multiplier (keep small for fairness)
  if (pro) xpEarned = Math.round(xpEarned * 1.05);

  return {
    total: state.queue.length,
    correct: state.correct,
    durationMs: state.durationMs,
    xpEarned: Math.max(0, xpEarned)
  };
}

// ----- Generators -------------------------------------------------------------
async function loadMCQs(count = 6) {
  // Replace with your real loader. This is a tiny placeholder with shuffled choices.
  const bank = [
    { q: "What is 12 × 3?", choices: ["15","24","36","48"], answer: 2 },
    { q: "Which planet is known as the Red Planet?", choices: ["Venus","Mars","Jupiter","Mercury"], answer: 1 },
    { q: "Synonym of 'Rapid'?", choices: ["Swift","Dull","Rigid","Sparse"], answer: 0 },
    { q: "What is the capital of Japan?", choices: ["Osaka","Kyoto","Tokyo","Sapporo"], answer: 2 },
    { q: "Opposite of 'Expand'?", choices: ["Contract","Extend","Diffuse","Elongate"], answer: 0 },
    { q: "15 + 27 = ?", choices: ["32","42","52","62"], answer: 1 },
    { q: "Chemical symbol for Gold?", choices: ["Ag","Gd","Au","Go"], answer: 2 }
  ];
  const pick = shuffle(bank).slice(0, Math.min(count, bank.length));
  return pick.map(x => ({ ...x, type: "mcq" }));
}

/**
 * Build a 5-pair MATCH round by default (pairCount).
 * Each card: { id:number, key:string, face:string, matched:boolean=false }
 */
function buildMatchRound(pairCount = 5) {
  const vocab = [
    ["Aurora", "Dawn"],
    ["Valor", "Courage"],
    ["Cipher", "Code"],
    ["Ember", "Spark"],
    ["Zenith", "Peak"],
    ["Echo", "Repeat"],
    ["Nimbus", "Cloud"],
    ["Vigor", "Energy"]
  ];
  const pairs = shuffle(vocab).slice(0, pairCount);

  // Create card deck (two cards per pair with same key)
  let id = 1;
  const cards = [];
  for (const [a, b] of pairs) {
    const key = `${a}-${b}`.toLowerCase();
    cards.push({ id: id++, key, face: a, matched: false });
    cards.push({ id: id++, key, face: b, matched: false });
  }
  shuffle(cards);

  return {
    type: "match",
    title: "Memory Match — Find All Pairs",
    subtitle: `${pairCount} pairs • Match words with related meaning`,
    cards
  };
}

// ----- Utils ------------------------------------------------------------------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
