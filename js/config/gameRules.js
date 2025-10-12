/* =========================================================
   Whylee v7 — Game Rules (Single Source of Truth)
   - XP system, streaks, badges, levels
   ========================================================= */
window.WhyleeRules = (() => {
  // XP
  const XP_PER_CORRECT = 10;
  const XP_PER_LEVEL_CLEAR = 50;
  const STREAK_BONUS_PER_3 = 15; // every 3 in-a-row
  const DAILY_TARGET = 12;       // min Qs/day to count streak

  // Levels
  const LEVELS = [
    { id: 1, label: 'Warm-up', questions: 12 },
    { id: 2, label: 'Pairs',   questions: 12 },
    { id: 3, label: 'Trivia',  questions: 12 }
  ];

  // Badges (minimal examples)
  const BADGES = [
    { id: 'streak_3',  name: '3-Day Streak',   rule: (stats) => stats.dayStreak >= 3 },
    { id: 'perfect_l1',name: 'Perfect L1',     rule: (stats) => stats.levelPerfects?.[1] >= 1 },
    { id: 'perfect_all', name:'Perfect Run',   rule: (stats) => [1,2,3].every(l => (stats.levelPerfects?.[l]||0) >= 1) }
  ];

  function xpForSession(session){
    // session = { correct, levelClears, streakTriples }
    return (session.correct * XP_PER_CORRECT)
         + (session.levelClears * XP_PER_LEVEL_CLEAR)
         + (session.streakTriples * STREAK_BONUS_PER_3);
  }

  return {
    XP_PER_CORRECT,
    XP_PER_LEVEL_CLEAR,
    STREAK_BONUS_PER_3,
    DAILY_TARGET,
    LEVELS,
    BADGES,
    xpForSession
  };
})();
