/**
 * Whylee Question Engine v8
 * Path: /scripts/ai/questionEngine.js
 *
 * Purpose:
 *  - Provide adaptive, session-scoped questions with difficulty tuning
 *  - Load daily questions from Cloud Functions (fallback to local pool)
 *  - Track correctness, timing, streaks, difficulty path
 *  - Compute XP with same formula used server-side (submitResults)
 *
 * Usage:
 *  import { initQuestionEngine } from "/scripts/ai/questionEngine.js";
 *  const eng = await initQuestionEngine({ mode: "daily", count: 5 });
 *  const q = eng.next();                       // { id, q, choices[], correctIndex, diff }
 *  eng.submit(guessIndex, timeMs);             // records result
 *  if (eng.isComplete()) { const r = eng.results(); /* send to cloudsync */ }
 */

const FN_BASE =
  // Use Functions domain by default; can be overridden with window.NETLIFY_FN_BASE
  (typeof window !== "undefined" && window.NETLIFY_FN_BASE)
    ? window.NETLIFY_FN_BASE
    : "https://us-central1-dailybrainbolt.cloudfunctions.net";

/* -------------------------------------------
   Local fallback pool (simple examples)
   diff: 1-easy, 2-normal, 3-hard, 4-elite
-------------------------------------------- */
const LOCAL_POOL = [
  { id:"f1", q:"Which animal is Whylee’s mascot?", choices:["Fox","Owl","Panda","Cat"], correctIndex:0, diff:1, topic:"brand" },
  { id:"f2", q:"What does XP represent in Whylee?", choices:["Luck","Effort over time","Speed only","Nothing"], correctIndex:1, diff:1, topic:"meta" },
  { id:"f3", q:"Best way to build a focus habit?", choices:["Random timing","Consistent slot","Never","Only weekends"], correctIndex:1, diff:1, topic:"habit" },
  { id:"f4", q:"A good warm-up before a session is…", choices:["Doomscroll","Deep breaths","Loud TV","Skipping sleep"], correctIndex:1, diff:2, topic:"habit" },
  { id:"f5", q:"For memory items, which method helps?", choices:["Spaced repetition","Constant guessing","None","Panic"], correctIndex:0, diff:2, topic:"memory" },
  { id:"f6", q:"In problem solving, a helpful tactic is…", choices:["Breakdown steps","Multitask hard","Ignore data","Rush"], correctIndex:0, diff:2, topic:"logic" },
  { id:"f7", q:"Cognitive load improves when you…", choices:["Limit distractions","Add noise","Open all tabs","Skip breaks"], correctIndex:0, diff:3, topic:"focus" },
  { id:"f8", q:"Creative insight often benefits from…", choices:["Incubation","Overwork","Monotony","Rigid rules"], correctIndex:0, diff:3, topic:"creativity" },
  { id:"f9", q:"For recall, chunking works by…", choices:["Grouping data","Randomizing","Deleting","Avoiding"], correctIndex:0, diff:3, topic:"memory" },
  { id:"f10",q:"Elite challenge: best next step after 3 wrong?", choices:["Reset strategy","Tilt harder","Quit","Ignore"], correctIndex:0, diff:4, topic:"resilience" }
];

/* -------------------------------------------
   Utilities
-------------------------------------------- */
function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Deterministic RNG when seed provided (Mulberry32)
function rngFromSeed(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------
   Remote loader (Cloud Functions)
   GET /getDailyQuestions?date=YYYY-MM-DD
   Response: { ok, date, payload: { items: [{ id,q,choices,correctIndex,diff,topic }...] } }
-------------------------------------------- */
async function loadDailyFromRemote(dateISO) {
  try {
    const url = `${FN_BASE}/getDailyQuestions${dateISO ? `?date=${encodeURIComponent(dateISO)}` : ""}`;
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.ok || !json.payload?.items?.length) throw new Error("Empty payload");
    return json.payload.items;
  } catch (e) {
    // Fallback to local pool
    return LOCAL_POOL.slice();
  }
}

/* -------------------------------------------
   XP formula (client parity with server):
   xp = correct*20 - (durationSec/total)*2
   (never below 0). Optional pro multiplier.
-------------------------------------------- */
function computeXp(correct, total, durationMs, { pro=false, bonus=0 } = {}) {
  const base = Math.max(0, Math.round(correct * 20 - (durationMs / 1000 / Math.max(total,1)) * 2));
  const mult = pro ? 1.10 : 1.00; // +10% for Pro (client-side cosmetic; server is source of truth)
  return Math.round(base * mult + bonus);
}

/* -------------------------------------------
   Engine
-------------------------------------------- */
export async function initQuestionEngine({
  mode = "daily",         // "daily" | "challenge" | "practice"
  count = 10,             // number of questions
  date = null,            // ISO date string for daily (optional)
  seed = null,            // number for deterministic shuffles (optional)
  startDifficulty = 2,    // 1..4
  minDifficulty = 1,
  maxDifficulty = 4,
  topics = null           // array of topic ids to bias selection
} = {}) {
  const rng = seed != null ? rngFromSeed(seed) : Math.random;

  // Load source (remote daily -> fallback local)
  const source = (mode === "daily")
    ? await loadDailyFromRemote(date)
    : LOCAL_POOL.slice();

  // Optional topic filter (soft bias)
  let pool = source.slice();
  if (Array.isArray(topics) && topics.length > 0) {
    const pri = pool.filter(q => topics.includes(q.topic));
    const sec = pool.filter(q => !topics.includes(q.topic));
    pool = pri.concat(sec.length ? shuffle(sec, rng) : []);
  }

  // Keep a map by difficulty
  const byDiff = new Map([[1,[]],[2,[]],[3,[]],[4,[]]]);
  pool.forEach(q => { const d = Math.min(maxDifficulty, Math.max(minDifficulty, q.diff || 2)); byDiff.get(d).push(q); });
  for (const d of byDiff.keys()) byDiff.set(d, shuffle(byDiff.get(d), rng));

  // Internal session state
  const state = {
    mode,
    total: count,
    asked: 0,
    correct: 0,
    durationMs: 0,
    current: null,
    startAt: null,
    difficulty: startDifficulty,
    streak: 0,
    path: [],      // difficulty path per question
    perQ: []       // { id, correct, timeMs, diff, guess }
  };

  function pickQuestionAtDifficulty(d) {
    const arr = byDiff.get(d);
    if (!arr?.length) {
      // fallback to nearest difficulty with stock
      for (let step = 1; step <= 3; step++) {
        if (byDiff.get(d - step)?.length) return byDiff.get(d - step).pop();
        if (byDiff.get(d + step)?.length) return byDiff.get(d + step).pop();
      }
      // last resort: any remaining
      const any = [...byDiff.get(1), ...byDiff.get(2), ...byDiff.get(3), ...byDiff.get(4)];
      return any.pop();
    }
    return arr.pop();
  }

  function next() {
    if (state.asked >= state.total) return null;
    const q = pickQuestionAtDifficulty(state.difficulty);
    if (!q) return null;
    state.current = {
      ...q,
      choices: shuffle(q.choices, rng)
    };
    state.startAt = performance.now();
    state.path.push(state.difficulty);
    state.asked += 1;
    return state.current;
  }

  function submit(guessIndex, timeMsOverride) {
    if (!state.current) throw new Error("No active question");
    const elapsed = timeMsOverride ?? (performance.now() - state.startAt);
    state.durationMs += elapsed;

    const guessLabel = state.current.choices[guessIndex];
    const correctLabel = state.current.choices[state.current.correctIndex];
    const isCorrect = (guessLabel === correctLabel);

    // Track
    state.perQ.push({
      id: state.current.id,
      correct: isCorrect,
      timeMs: Math.round(elapsed),
      diff: state.path[state.path.length - 1],
      guess: guessIndex
    });
    if (isCorrect) { state.correct += 1; state.streak += 1; }
    else { state.streak = 0; }

    // Adapt difficulty
    if (isCorrect && state.streak >= 2) {       // 2-correct mini-streak → harder
      state.difficulty = Math.min(maxDifficulty, state.difficulty + 1);
    } else if (!isCorrect) {                    // miss → soften
      state.difficulty = Math.max(minDifficulty, state.difficulty - 1);
    }

    // Clear active
    state.current = null;
    state.startAt = null;
    return isCorrect;
  }

  function isComplete() {
    return state.asked >= state.total && !state.current;
  }

  function results({ pro=false, bonus=0 } = {}) {
    if (!isComplete()) {
      // allow partial session export for autosave, but mark as incomplete
      const xp = computeXp(state.correct, Math.max(1, state.asked), state.durationMs, { pro, bonus });
      return {
        mode: state.mode,
        correct: state.correct,
        total: state.asked,
        durationMs: Math.round(state.durationMs),
        xpEarned: xp,
        difficultyTrail: state.path.slice(0, state.asked),
        perQuestion: state.perQ.slice(),
        complete: false
      };
    }
    const xp = computeXp(state.correct, state.total, state.durationMs, { pro, bonus });
    return {
      mode: state.mode,
      correct: state.correct,
      total: state.total,
      durationMs: Math.round(state.durationMs),
      xpEarned: xp,
      difficultyTrail: state.path.slice(0, state.total),
      perQuestion: state.perQ.slice(),
      complete: true
    };
  }

  return {
    next,
    submit,
    isComplete,
    results,
    // diagnostics
    _debug: () => JSON.parse(JSON.stringify(state))
  };
}
