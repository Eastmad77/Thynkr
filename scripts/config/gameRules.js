/**
 * ============================================================================
 * Whylee — Game Rules (v1)
 * Single source of truth for:
 * - Session rules (levels, questions per level, redemption, timers)
 * - XP model (base, streak bonus, level clear, perfect, daily)
 * - Badges (thresholds & moments)
 * - Streak logic (daily streak roll-over)
 * - Avatar unlocks (free & pro)
 * - Utility evaluators to compute rewards and next state
 * ----------------------------------------------------------------------------
 * Pure functions. No DOM. No network.
 * Import with:  import * as Rules from '/scripts/config/gameRules.js'
 * ============================================================================
 */

export const VERSION = '1.0.0';

/* ---------------------------------------------
 * Levels / Session structure
 * ------------------------------------------- */
export const LEVELS = [
  { id: 1, name: 'Warm-Up',    questions: 12, perQuestionSeconds: 10 },
  { id: 2, name: 'Pairs',      questions: 12, perQuestionSeconds: 10 },
  { id: 3, name: 'Mixed Trivia', questions: 12, perQuestionSeconds: 10 }
];

export const SESSION = {
  totalQuestions: LEVELS.reduce((a, l) => a + l.questions, 0), // 36
  redemptionStreak: 3,     // 3 consecutive correct removes one previous wrong
  countdownMs: 3000,       // 3–2–1–Go overlay
  questionTimerMs: 10000,  // 10s visual timer per question
};

/* ---------------------------------------------
 * XP model
 * ------------------------------------------- */
export const XP = {
  basePerCorrect: 10,              // Correct answer
  streakBonusSteps: [3, 5, 10],    // When streak reaches these, add a small bonus
  streakBonusXP:   [5, 10, 20],    // Matching bonuses for the steps above
  levelClear: 50,                  // Clearing a level (>= 9/12 correct)
  levelPerfect: 100,               // 12/12
  dailyCompletion: 30,             // Complete >= 1 level for the day
  proMultiplier: 1.15,             // Small boost for Pro
};

/* ---------------------------------------------
 * Badges
 * ------------------------------------------- */
export const BADGES = {
  firstCorrect: { id: 'first-correct', name: 'First Spark', desc: 'Answer your first question correctly.' },
  threeStreak:  { id: 'three-streak',  name: 'Warming Up',  desc: '3 correct in a row.' },
  tenStreak:    { id: 'ten-streak',    name: 'On Fire',     desc: '10 correct in a row.' },
  levelClear:   { id: 'level-clear',   name: 'Level Clear', desc: 'Clear any level.' },
  levelPerfect: { id: 'level-perfect', name: 'Flawless',    desc: 'Perfect score in a level.' },
  sevenDay:     { id: 'seven-day',     name: 'Habit Builder', desc: '7-day daily streak.' },
  thirtyDay:    { id: 'thirty-day',    name: 'Relentless',    desc: '30-day daily streak.' },
  hundredDay:   { id: 'hundred-day',   name: 'Iron Will',     desc: '100-day daily streak.' },
};

/* ---------------------------------------------
 * Avatar unlocks (metadata IDs should match /media/avatars/ files)
 * ------------------------------------------- */
export const AVATAR_UNLOCKS = [
  { id: 'fox-default', tier: 'free',  rule: { type: 'always' } },
  { id: 'fox-focused', tier: 'free',  rule: { type: 'streakDays', days: 3 } },
  { id: 'fox-genius',  tier: 'free',  rule: { type: 'perfectLevels', count: 1 } },
  { id: 'fox-happy',   tier: 'free',  rule: { type: 'xpTotal', xp: 500 } },
  { id: 'owl-pro',     tier: 'pro',   rule: { type: 'entitlement', key: 'pro' } },
  { id: 'panda-pro',   tier: 'pro',   rule: { type: 'entitlement', key: 'pro' } },
  { id: 'cat-pro',     tier: 'pro',   rule: { type: 'entitlement', key: 'pro' } },
  { id: 'monkey-pro',  tier: 'pro',   rule: { type: 'entitlement', key: 'pro' } },
];

/* ---------------------------------------------
 * Helpers: dates & streaks
 * ------------------------------------------- */
export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function nextDayKey(dateKey) {
  const d = new Date(dateKey);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Compute new daily streak after a session completion.
 * @param {string|null} lastDateKey - e.g., '2025-10-10'
 * @param {number} lastStreak
 * @param {string} currentDateKey
 * @returns {{streak:number, lastDateKey:string, counted:boolean}}
 */
export function rollDailyStreak(lastDateKey, lastStreak, currentDateKey = todayKey()) {
  // If already counted today, do nothing
  if (lastDateKey === currentDateKey) {
    return { streak: lastStreak, lastDateKey, counted: false };
  }
  // If yesterday was lastDateKey, increment; otherwise reset to 1
  const expected = lastDateKey ? nextDayKey(lastDateKey) : currentDateKey;
  const streak = (!lastDateKey || expected === currentDateKey) ? Math.max(1, lastStreak + 1) : 1;
  return { streak, lastDateKey: currentDateKey, counted: true };
}

/* ---------------------------------------------
 * XP calculations
 * ------------------------------------------- */
/**
 * XP for a single question result.
 * @param {boolean} correct
 * @param {number} currentStreakBeforeAnswer
 * @param {boolean} isPro
 */
export function xpForAnswer(correct, currentStreakBeforeAnswer, isPro = false) {
  if (!correct) return 0;
  let xp = XP.basePerCorrect;

  // Streak bonuses trigger on achieving these thresholds
  const nextStreak = currentStreakBeforeAnswer + 1;
  XP.streakBonusSteps.forEach((step, i) => {
    if (nextStreak === step) xp += XP.streakBonusXP[i];
  });

  if (isPro) xp = Math.round(xp * XP.proMultiplier);
  return xp;
}

/**
 * XP for finishing a level.
 * @param {number} correctInLevel
 * @param {boolean} isPro
 */
export function xpForLevelClear(correctInLevel, isPro = false) {
  const minForClear = 9; // >= 9/12 is a "clear"
  if (correctInLevel < minForClear) return 0;
  const perfect = correctInLevel === 12;
  let xp = XP.levelClear + (perfect ? XP.levelPerfect : 0);
  if (isPro) xp = Math.round(xp * XP.proMultiplier);
  return xp;
}

/**
 * XP for daily completion.
 */
export function xpForDailyCompletion(isPro = false) {
  return Math.round((isPro ? XP.proMultiplier : 1) * XP.dailyCompletion);
}

/* ---------------------------------------------
 * Badges evaluations
 * ------------------------------------------- */
/**
 * Check which badges newly unlocked given a delta in progress.
 * @param {object} prev - previous totals { totalCorrect, bestStreak, dailyStreak, perfectLevels }
 * @param {object} now  - current totals  { totalCorrect, bestStreak, dailyStreak, perfectLevels }
 * @param {object} levelStats - { cleared:boolean, perfect:boolean }
 * @returns {Array} array of BADGES.* entries
 */
export function newlyUnlockedBadges(prev, now, levelStats = { cleared: false, perfect: false }) {
  const out = [];

  // First correct
  if (prev.totalCorrect === 0 && now.totalCorrect > 0) out.push(BADGES.firstCorrect);

  // Streak milestones
  if (prev.bestStreak < 3 && now.bestStreak >= 3) out.push(BADGES.threeStreak);
  if (prev.bestStreak < 10 && now.bestStreak >= 10) out.push(BADGES.tenStreak);

  // Level events
  if (!levelStats) levelStats = { cleared: false, perfect: false };
  if (levelStats.cleared) out.push(BADGES.levelClear);
  if (levelStats.perfect) out.push(BADGES.levelPerfect);

  // Daily streak milestones
  if (prev.dailyStreak < 7 && now.dailyStreak >= 7) out.push(BADGES.sevenDay);
  if (prev.dailyStreak < 30 && now.dailyStreak >= 30) out.push(BADGES.thirtyDay);
  if (prev.dailyStreak < 100 && now.dailyStreak >= 100) out.push(BADGES.hundredDay);

  return out;
}

/* ---------------------------------------------
 * Avatar unlock evaluation
 * ------------------------------------------- */
/**
 * Return list of avatar IDs unlocked under the current snapshot.
 * @param {object} snapshot - { xpTotal, dailyStreak, perfectLevels, entitlements:{pro:boolean} }
 */
export function unlockedAvatars(snapshot) {
  const { xpTotal = 0, dailyStreak = 0, perfectLevels = 0, entitlements = {} } = snapshot || {};
  return AVATAR_UNLOCKS.filter(a => {
    const r = a.rule;
    switch (r.type) {
      case 'always': return true;
      case 'streakDays': return dailyStreak >= r.days;
      case 'xpTotal': return xpTotal >= r.xp;
      case 'perfectLevels': return perfectLevels >= r.count;
      case 'entitlement': return !!entitlements[r.key];
      default: return false;
    }
  }).map(a => a.id);
}

/* ---------------------------------------------
 * Session reducer helpers
 * ------------------------------------------- */
/**
 * Apply an answer to a running session.
 * Returns next session state + xp awarded for the answer.
 * @param {object} s - session state { level, qIndex, streak, wrongCount, totalCorrect, bestStreak }
 * @param {boolean} correct
 * @param {boolean} isPro
 */
export function applyAnswer(s, correct, isPro = false) {
  const next = { ...s };
  let awarded = 0;

  if (correct) {
    next.totalCorrect += 1;
    next.streak += 1;
    next.bestStreak = Math.max(next.bestStreak || 0, next.streak);
    awarded = xpForAnswer(true, s.streak, isPro);

    // Redemption: remove one previous wrong on reaching streak threshold
    if ((next.streak % SESSION.redemptionStreak === 0) && next.wrongCount > 0) {
      next.wrongCount -= 1;
    }
  } else {
    next.streak = 0;
    next.wrongCount += 1;
  }

  next.qIndex += 1;
  return { next, xp: awarded };
}

/**
 * Compute level-completion rewards.
 * @param {number} levelId
 * @param {Array<boolean>} answersInLevel
 * @param {boolean} isPro
 * @returns {{xp:number, cleared:boolean, perfect:boolean}}
 */
export function finalizeLevel(levelId, answersInLevel, isPro = false) {
  const correct = answersInLevel.reduce((a, ok) => a + (ok ? 1 : 0), 0);
  const xp = xpForLevelClear(correct, isPro);
  return {
    xp,
    cleared: correct >= 9,
    perfect: correct === LEVELS.find(l => l.id === levelId)?.questions
  };
}

/* ---------------------------------------------
 * Starter snapshot factory (for app state)
 * ------------------------------------------- */
export function initialProgress() {
  return {
    xpTotal: 0,
    totalCorrect: 0,
    bestStreak: 0,
    dailyStreak: 0,
    lastDateKey: null,
    perfectLevels: 0,
    entitlements: { pro: false, trialActive: false }
  };
}

export function initialSession() {
  return {
    level: 1,
    qIndex: 0,
    streak: 0,
    wrongCount: 0,
    totalCorrect: 0,
    bestStreak: 0
  };
}
