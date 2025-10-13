/**
 * gameRules.js — v7000
 * Single source of truth for XP, streaks, badges, and pacing.
 */
export const GameRules = {
  build: '7000',

  // Level/Session pacing
  session: {
    levels: [1, 2, 3],
    questionsPerLevel: 12,
    redemptionStreak: 3,     // 3 correct in a row removes 1 wrong
    perQuestionSeconds: 10,  // UI timer bar length
  },

  // XP model
  xp: {
    perCorrect: 10,
    perLevelClearBonus: 50,
    perfectLevelBonus: 30,   // no wrongs at the level
    dailyCompletionBonus: 40 // complete ≥1 level today
  },

  // Streaks
  streak: {
    storageKey: 'wl_streak',
    lastDateKey: 'wl_last_date',
  },

  // Badges unlock rules (id → predicate)
  badges: [
    { id: 'first_win',   name: 'First Win',    test: s => s.levelClears >= 1 },
    { id: 'seven_streak',name: '7 Day Streak', test: s => s.dayStreak >= 7 },
    { id: 'perfect_l1',  name: 'Perfect L1',   test: s => s.perfectLevels.includes(1) },
    { id: 'perfect_all', name: 'Perfect All',  test: s => [1,2,3].every(l => s.perfectLevels.includes(l)) },
  ],

  // Posters per level
  posters: {
    1: '/media/posters/poster-level1.jpg',   // optional; falls back to poster-start.jpg
    2: '/media/posters/poster-level2.jpg',
    3: '/media/posters/poster-level3.jpg',
    countdown: '/media/posters/poster-countdown.jpg',
    start: '/media/posters/poster-start.jpg',
    success: '/media/posters/poster-success.jpg',
    gameover: '/media/posters/poster-gameover.jpg',
    night: '/media/posters/poster-night.jpg'
  },

  // SFX map
  sfx: {
    correct: '/media/audio/correct.mp3',
    wrong: '/media/audio/wrong.mp3',
    levelUp: '/media/audio/level-up.mp3',
    start: '/media/audio/start-chime.mp3',
    gameOver: '/media/audio/game-over-low.mp3'
  }
};
