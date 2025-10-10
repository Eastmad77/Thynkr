// achievements.js — XP + badges
window.WhyleeAchievements = (function(){
  const XPKEY = 'wl_xp';
  const BADGEKEY = 'wl_badges';

  const BADGES = {
    streak3: { id:'streak3', icon:'🔥', label:'3-Day Streak' },
    streak7: { id:'streak7', icon:'🌙', label:'7-Day Streak' },
    perfectL1: { id:'perfectL1', icon:'✅', label:'Perfect Level 1' },
    perfectL2: { id:'perfectL2', icon:'💠', label:'Perfect Level 2' },
    perfectL3: { id:'perfectL3', icon:'🏆', label:'Perfect Level 3' },
    firstClear: { id:'firstClear', icon:'🎉', label:'First Clear' }
  };

  function xp(){ return Number(localStorage.getItem(XPKEY)||0); }
  function addXP(n){ const v = xp()+n; localStorage.setItem(XPKEY, String(v)); return v; }

  function getBadges(){ try{ return JSON.parse(localStorage.getItem(BADGEKEY)||'[]'); } catch { return []; } }
  function has(id){ return getBadges().includes(id); }
  function award(id){
    if (has(id)) return false;
    const next = [...getBadges(), id];
    localStorage.setItem(BADGEKEY, JSON.stringify(next));
    return true;
  }
  function pretty(ids){ return ids.map(id => BADGES[id]).filter(Boolean); }

  // helpers used by game.js
  function maybeAwardStreak(streakDays){
    if (streakDays>=3) award('streak3');
    if (streakDays>=7) award('streak7');
  }
  function maybeAwardPerfect(level){
    if (level===1) award('perfectL1');
    if (level===2) award('perfectL2');
    if (level===3) award('perfectL3');
  }

  return { xp, addXP, getBadges, has, award, pretty, maybeAwardStreak, maybeAwardPerfect };
})();
