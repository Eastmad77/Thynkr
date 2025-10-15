// scripts/achievements.js — v7000
export const Achievements = (() => {
  const state = {
    xp: Number(localStorage.getItem('wl_xp') || 0),
    streak: Number(localStorage.getItem('wl_streak') || 0),
    bestStreak: Number(localStorage.getItem('wl_best_streak') || 0),
    badges: JSON.parse(localStorage.getItem('wl_badges') || '[]')
  };

  function save() {
    localStorage.setItem('wl_xp', String(state.xp));
    localStorage.setItem('wl_streak', String(state.streak));
    localStorage.setItem('wl_best_streak', String(state.bestStreak));
    localStorage.setItem('wl_badges', JSON.stringify(state.badges));
  }

  function awardXP(n) { state.xp += n; save(); return state.xp; }
  function addStreak(n = 1) {
    state.streak += n;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;
    save();
    return state.streak;
  }
  function resetStreak() { state.streak = 0; save(); }

  const BADGE_RULES = [
    { id: 'streak-3',   test: s => s >= 3,   title: 'Warming Up' },
    { id: 'streak-7',   test: s => s >= 7,   title: 'One Week' },
    { id: 'streak-14',  test: s => s >= 14,  title: 'Two Weeks' },
    { id: 'xp-1000',    test: (_,xp) => xp >= 1000, title: 'Rising Mind' },
    { id: 'xp-5000',    test: (_,xp) => xp >= 5000, title: 'Veteran Learner' }
  ];

  function checkBadges() {
    const owned = new Set(state.badges);
    for (const rule of BADGE_RULES) {
      if (owned.has(rule.id)) continue;
      if (rule.test(state.streak, state.xp)) {
        state.badges.push(rule.id);
        save();
        dispatchEvent(new CustomEvent('wl:badge', { detail: rule }));
      }
    }
  }

  return {
    get state() { return { ...state }; },
    awardXP, addStreak, resetStreak, checkBadges
  };
})();
