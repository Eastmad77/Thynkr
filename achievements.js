/* Whylee Achievements v6004 */
(() => {
  const RULES = [
    { id:'streak-3',   label:'3-Day Streak',        test: s => s.streak >= 3,   icon:'🔥' },
    { id:'streak-7',   label:'7-Day Streak',        test: s => s.streak >= 7,   icon:'🏅' },
    { id:'perfect-l1', label:'Perfect Level 1',     test: s => s.l1 === 12,     icon:'🦊' },
    { id:'perfect-l2', label:'Perfect Level 2',     test: s => s.l2 === 12,     icon:'🧠' },
    { id:'perfect-l3', label:'Perfect Level 3',     test: s => s.l3 === 12,     icon:'⚡' },
    { id:'session-36', label:'All 36 Answered',     test: s => s.total === 36,  icon:'🎯' },
    { id:'accuracy-90',label:'90% Accuracy+',       test: s => s.acc >= 0.9,    icon:'💎' }
  ];

  function evaluate(currentBadges, snapshot){
    const have = new Set(currentBadges);
    RULES.forEach(r => { if (r.test(snapshot)) have.add(r.id); });
    return Array.from(have);
  }

  function pretty(badges){
    const map = Object.fromEntries(RULES.map(r=>[r.id, r]));
    return badges.map(id => ({ id, ...map[id] })).filter(Boolean);
  }

  window.WhyleeAchievements = { evaluate, pretty };
})();
