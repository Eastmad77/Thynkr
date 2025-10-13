/**
 * ============================================================================
 * Whylee — gameRules (v7000)
 * Single source of truth for:
 *  - XP economy (per action, streak multipliers, level thresholds)
 *  - Daily streak logic (calendar-based, localStorage keys)
 *  - Badge definitions + unlock checks
 *  - Avatar unlock progression (free + pro)
 *  - Answer evaluation helpers (apply correct/wrong, redemption)
 *  - Pro trial gates (client-side guard only; pair with billing backend)
 * ============================================================================
 * All numbers are easy to tune. Keep server/billing as source of truth where needed.
 */

export const GameRules = Object.freeze({
  // ---------- Economy ----------
  XP: {
    baseCorrect: 10,               // base XP per correct answer
    baseWrong: 0,                   // wrong answer XP (usually 0)
    levelClear: 75,                 // bonus for finishing a level
    perfectLevel: 50,               // added bonus for 12/12
    streakBonusPer3: 10,            // every 3-in-a-row within a session
    dailyLogin: 15,                 // once per calendar day
    shareBonus: 10,                 // optional: sharing result
    reflectionBonus: 10,            // optional: completing daily reflection
    proMultiplier: 1.15,            // small passive boost for Pro (15%)
    maxSessionBonus: 150,           // cap safety
  },

  // Intra-session redemption rule: 3 consecutive correct removes 1 previous wrong
  Redemption: {
    threshold: 3,
    removeWrong: 1,
  },

  // Level sizing
  Levels: {
    perLevelQuestions: 12,
    totalLevels: 3,
  },

  // ---------- Player Level thresholds (XP → Level) ----------
  // Level is 1-based. Increase/adjust freely. Keep monotonic ascending.
  LevelThresholds: [
    0,     // Level 1 starts at 0 XP
    150,   // Level 2
    350,   // Level 3
    650,   // Level 4
    1000,  // Level 5
    1500,  // Level 6
    2100,  // Level 7
    2800,  // Level 8
    3600,  // Level 9
    4500,  // Level 10
  ],

  // ---------- Badges ----------
  // id: stable key; title/desc shown in UI; check(): returns true if unlocked
  Badges: [
    {
      id: 'first-correct',
      title: 'First Steps',
      desc: 'Score your first correct answer.',
      check: ({ totals }) => totals.correct >= 1,
    },
    {
      id: 'level-cleared',
      title: 'Level Clear',
      desc: 'Finish any level.',
      check: ({ session }) => session.levelsCleared >= 1,
    },
    {
      id: 'perfect-12',
      title: 'Perfect Twelve',
      desc: 'Finish a level with 12/12 correct.',
      check: ({ session }) => session.perfectLevels >= 1,
    },
    {
      id: 'streak-3',
      title: 'Hot Streak',
      desc: 'Get 3 correct in a row.',
      check: ({ session }) => session.maxConsecCorrect >= 3,
    },
    {
      id: 'streak-7-days',
      title: 'Seven-Day Flame',
      desc: 'Play at least one level daily for 7 days.',
      check: ({ daily }) => daily.streak >= 7,
    },
    {
      id: 'streak-30-days',
      title: 'Unbroken Month',
      desc: 'Play at least one level daily for 30 days.',
      check: ({ daily }) => daily.streak >= 30,
    },
    {
      id: 'xp-1k',
      title: 'Rising Mind',
      desc: 'Reach 1000 total XP.',
      check: ({ totals }) => totals.xp >= 1000,
    },
    {
      id: 'xp-5k',
      title: 'Ascendant',
      desc: 'Reach 5000 total XP.',
      check: ({ totals }) => totals.xp >= 5000,
    },
  ],

  // ---------- Avatar Unlocks ----------
  // Tiers can be shown in the avatar picker with lock hints.
  Avatars: [
    // Free core fox set (already in your build)
    { id: 'fox-default',   name: 'Fox — Core',     tier: 'free',  xpRequired: 0,    streakRequired: 0 },
    { id: 'fox-focused',   name: 'Fox — Focused',  tier: 'free',  xpRequired: 250,  streakRequired: 3 },
    { id: 'fox-happy',     name: 'Fox — Happy',    tier: 'free',  xpRequired: 400,  streakRequired: 5 },
    { id: 'fox-curious',   name: 'Fox — Curious',  tier: 'free',  xpRequired: 600,  streakRequired: 7 },
    { id: 'fox-genius',    name: 'Fox — Genius',   tier: 'free',  xpRequired: 900,  streakRequired: 10 },

    // Pro pack (new)
    { id: 'owl-pro',       name: 'Owl (Pro)',      tier: 'pro',   xpRequired: 0,    streakRequired: 0 },
    { id: 'panda-pro',     name: 'Panda (Pro)',    tier: 'pro',   xpRequired: 300,  streakRequired: 3 },
    { id: 'cat-pro',       name: 'Cat (Pro)',      tier: 'pro',   xpRequired: 600,  streakRequired: 5 },
    { id: 'monkey-pro',    name: 'Monkey (Pro)',   tier: 'pro',   xpRequired: 900,  streakRequired: 7 },
  ],

  // ---------- Pro Trial Guard (client-side hint; enforce on backend) ----------
  Trial: {
    days: 3, // 3-day trial
  },

  // ---------- Storage Keys ----------
  StorageKeys: {
    totals: 'whylee:totals',              // { xp, correct, wrong, sessions }
    daily: 'whylee:daily',                // { streak, lastDate } yyyy-mm-dd
    badges: 'whylee:badges',              // string[] unlocked ids
    prefs: 'whylee:prefs',                // e.g., selected avatar
    entitlements: 'whylee:entitlements',  // pro, trialActive, trialEndsAt
  },
});

/* =============================================================================
   Helpers (pure, testable)
   ========================================================================== */

/** Return today in YYYY-MM-DD (local time) */
export function dailyKey(date = new Date()) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Given total XP, return 1-based player level and next threshold info */
export function getLevelFromXP(totalXP, thresholds = GameRules.LevelThresholds) {
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (totalXP >= thresholds[i]) level = i + 1;
  }
  const currentStart = thresholds[Math.min(level - 1, thresholds.length - 1)] || 0;
  const nextThreshold = thresholds[level] || null;
  const into = totalXP - currentStart;
  const toNext = nextThreshold ? Math.max(0, nextThreshold - totalXP) : null;
  return { level, nextThreshold, into, toNext };
}

/** XP for an action, with optional pro multiplier */
export function xpForAction(kind, { isPro = false } = {}) {
  const table = GameRules.XP;
  let base = 0;
  switch (kind) {
    case 'correct': base = table.baseCorrect; break;
    case 'wrong': base = table.baseWrong; break;
    case 'levelClear': base = table.levelClear; break;
    case 'perfectLevel': base = table.perfectLevel; break;
    case 'streak3': base = table.streakBonusPer3; break;
    case 'dailyLogin': base = table.dailyLogin; break;
    case 'share': base = table.shareBonus; break;
    case 'reflection': base = table.reflectionBonus; break;
    default: base = 0;
  }
  return Math.round(isPro ? base * table.proMultiplier : base);
}

/**
 * Apply an answer result to session state.
 * - Tracks totalAsked, totalCorrect, wrongCount, correctInRow
 * - Applies redemption (every 3-in-a-row removes one previous wrong)
 * - Returns { deltaXP, events[] } for UI
 */
export function applyAnswerResult(isCorrect, sessionState, opts = {}) {
  const { Redemption, XP } = GameRules;
  const events = [];
  let deltaXP = 0;

  sessionState.totalAsked = (sessionState.totalAsked || 0) + 1;

  if (isCorrect) {
    sessionState.totalCorrect = (sessionState.totalCorrect || 0) + 1;
    sessionState.correctInRow = (sessionState.correctInRow || 0) + 1;

    // track maxConsecCorrect
    sessionState.maxConsecCorrect = Math.max(
      sessionState.maxConsecCorrect || 0,
      sessionState.correctInRow
    );

    deltaXP += xpForAction('correct', opts);

    // Redemption: every N in a row → remove one wrong (visual: tiny confetti)
    if (sessionState.correctInRow > 0 &&
        sessionState.correctInRow % Redemption.threshold === 0 &&
        (sessionState.wrongCount || 0) > 0) {
      sessionState.wrongCount = Math.max(0, (sessionState.wrongCount || 0) - Redemption.removeWrong);
      events.push('redemption');
      deltaXP += xpForAction('streak3', opts);
    }
  } else {
    sessionState.correctInRow = 0;
    sessionState.wrongCount = (sessionState.wrongCount || 0) + 1;
    deltaXP += xpForAction('wrong', opts);
  }

  // Safety cap for session bonus (rare)
  if ((sessionState.sessionBonusXP || 0) + deltaXP > XP.maxSessionBonus) {
    const over = (sessionState.sessionBonusXP || 0) + deltaXP - XP.maxSessionBonus;
    deltaXP -= Math.max(0, over);
  }
  sessionState.sessionBonusXP = (sessionState.sessionBonusXP || 0) + deltaXP;

  return { deltaXP, events };
}

/**
 * Call when a level is finished.
 * - Adds level clear bonus; if perfect, adds perfect bonus and marks session.perfectLevels++.
 * - Returns { deltaXP, perfect }
 */
export function applyLevelClear(levelStats, sessionState, opts = {}) {
  const { perLevelQuestions } = GameRules.Levels;
  const correct = levelStats.correct || 0;
  const perfect = correct >= perLevelQuestions;

  let deltaXP = xpForAction('levelClear', opts);
  if (perfect) {
    deltaXP += xpForAction('perfectLevel', opts);
    sessionState.perfectLevels = (sessionState.perfectLevels || 0) + 1;
  }

  sessionState.levelsCleared = (sessionState.levelsCleared || 0) + 1;
  sessionState.sessionBonusXP = (sessionState.sessionBonusXP || 0) + deltaXP;

  return { deltaXP, perfect };
}

/**
 * Daily streak updater. Call once when a user completes >= 1 level in a session.
 * Returns updated { streak, lastDate }.
 */
export function updateDailyStreak(daily) {
  const today = dailyKey();
  const last = daily.lastDate || null;

  if (last === today) {
    // already counted today
    return { streak: daily.streak || 1, lastDate: today };
  }
  if (!last) {
    return { streak: 1, lastDate: today };
  }

  // If yesterday → +1; else reset to 1
  const lastDate = new Date(last);
  const next = new Date(lastDate); next.setDate(lastDate.getDate() + 1);
  const nextKey = dailyKey(next);

  if (nextKey === today) {
    return { streak: (daily.streak || 0) + 1, lastDate: today };
  }
  return { streak: 1, lastDate: today };
}

/** Compute which badges become newly unlocked, given current snapshot */
export function calcNewBadgesUnlocked({ totals, daily, session }, unlockedSet = new Set()) {
  const newly = [];
  for (const b of GameRules.Badges) {
    if (unlockedSet.has(b.id)) continue;
    if (b.check({ totals, daily, session })) {
      newly.push(b.id);
    }
  }
  return newly;
}

/** Return avatars available for selection given totals + daily + entitlements */
export function listUnlockedAvatars({ totals, daily, entitlements }) {
  const isPro = !!entitlements?.pro;
  const streak = daily?.streak || 0;
  const xp = totals?.xp || 0;

  return GameRules.Avatars.filter(av => {
    if (av.tier === 'pro' && !isPro) return false;
    if (xp < av.xpRequired) return false;
    if (streak < av.streakRequired) return false;
    return true;
  });
}

/** Returns next XP and streak milestones for UI hinting */
export function nextMilestones({ totals, daily, entitlements }) {
  const isPro = !!entitlements?.pro;
  const xp = totals?.xp || 0;
  const streak = daily?.streak || 0;

  const nextAvatar = GameRules.Avatars
    .filter(a => (a.tier === 'free' || isPro))
    .filter(a => (a.xpRequired > xp) || (a.streakRequired > streak))
    .sort((a, b) => {
      const ax = Math.max(0, a.xpRequired - xp) + Math.max(0, a.streakRequired - streak) * 50;
      const bx = Math.max(0, b.xpRequired - xp) + Math.max(0, b.streakRequired - streak) * 50;
      return ax - bx;
    })[0] || null;

  // Next level threshold
  const { level, nextThreshold, toNext } = getLevelFromXP(xp, GameRules.LevelThresholds);

  return {
    level,
    nextLevelXP: nextThreshold,
    xpToNextLevel: toNext,
    nextAvatar,
  };
}

/**
 * Apply utility XP (daily login, share, reflection).
 * Returns delta XP awarded.
 */
export function applyUtilityXP(kind, totals, opts = {}) {
  const delta = xpForAction(kind, opts);
  totals.xp = (totals.xp || 0) + delta;
  return delta;
}

/* =============================================================================
   LocalStorage convenience (optional)
   Keep these thin; production apps often replace with a proper storage service.
   ========================================================================== */
function getJSON(key, fallback) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch { return fallback; }
}
function setJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

/** Load all tracked state buckets */
export function loadAllState() {
  const k = GameRules.StorageKeys;
  return {
    totals: getJSON(k.totals, { xp: 0, correct: 0, wrong: 0, sessions: 0 }),
    daily: getJSON(k.daily, { streak: 0, lastDate: null }),
    badges: new Set(getJSON(k.badges, [])),
    prefs: getJSON(k.prefs, { avatarId: 'fox-default' }),
    entitlements: getJSON(k.entitlements, { pro: false, trialActive: false, trialEndsAt: null }),
  };
}

/** Persist one or more buckets (shallow merge for objects) */
export function saveState(partial) {
  const k = GameRules.StorageKeys;
  if ('totals' in partial) setJSON(k.totals, partial.totals);
  if ('daily' in partial) setJSON(k.daily, partial.daily);
  if ('badges' in partial) setJSON(k.badges, Array.from(partial.badges || []));
  if ('prefs' in partial) setJSON(k.prefs, partial.prefs);
  if ('entitlements' in partial) setJSON(k.entitlements, partial.entitlements);
}

/* =============================================================================
   Example session wiring (optional reference)
   ========================================================================== */

/**
 * Handle the end of a level:
 *  - apply level-clear XP (+ perfect bonus when applicable)
 *  - update totals
 *  - update daily streak (count level completion once/day)
 *  - check badges; return any newly unlocked IDs
 */
export function finalizeLevel({ levelStats, sessionState, totals, daily, badges, entitlements }) {
  const isPro = !!entitlements?.pro;
  const { deltaXP, perfect } = applyLevelClear(levelStats, sessionState, { isPro });

  totals.xp = (totals.xp || 0) + deltaXP;
  totals.correct = (totals.correct || 0) + (levelStats.correct || 0);
  totals.wrong = (totals.wrong || 0) + (levelStats.wrong || 0);

  // Daily streak counts when user completes at least one level
  const updatedDaily = updateDailyStreak(daily);

  // Badge unlocks
  const unlocked = calcNewBadgesUnlocked({
    totals,
    daily: updatedDaily,
    session: sessionState,
  }, badges);

  unlocked.forEach(id => badges.add(id));

  return {
    deltaXP,
    perfect,
    updatedDaily,
    newlyUnlockedBadges: unlocked,
  };
}

/**
 * Decide if Pro trial prompt should be shown.
 * Client-side heuristic:
 *  - Not pro
 *  - No active trial
 *  - XP >= 300 OR daily streak >= 3
 * Server/billing still must enforce truth.
 */
export function shouldOfferTrial({ totals, daily, entitlements }) {
  if (entitlements?.pro) return false;
  if (entitlements?.trialActive) return false;
  const xp = totals?.xp || 0;
  const streak = daily?.streak || 0;
  return xp >= 300 || streak >= 3;
}

/**
 * Begin a local trial (client-side flag). Real activation must happen via Stripe/Play.
 */
export function startLocalTrial(entitlements, now = Date.now()) {
  const ms = GameRules.Trial.days * 24 * 60 * 60 * 1000;
  entitlements.trialActive = true;
  entitlements.trialEndsAt = new Date(now + ms).toISOString();
  return entitlements.trialEndsAt;
}

/** End local trial (client-side) */
export function endLocalTrial(entitlements) {
  entitlements.trialActive = false;
  entitlements.trialEndsAt = null;
}

/* =============================================================================
   End of module
   ========================================================================== */
