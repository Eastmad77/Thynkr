/* =========================================================
   Whylee v7 — Entitlements
   - Derives: pro, trialActive, trialExpiresAt, source
   - Guards feature access
   ========================================================= */
window.WhyleeEntitlements = (() => {
  const KEY = 'whylee:entitlements';

  function now(){ return Date.now(); }
  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(e){ localStorage.setItem(KEY, JSON.stringify(e)); }

  function snapshot(){
    const e = load();
    const trialActive = e.trialExpiresAt ? (now() < e.trialExpiresAt) : false;
    const pro = !!e.pro || trialActive;
    return {
      pro,
      trialActive,
      trialExpiresAt: e.trialExpiresAt || null,
      source: e.source || null
    };
  }

  function grantTrial(days=3, source='stripe'){
    const ms = days * 24 * 60 * 60 * 1000;
    const e = load();
    e.trialExpiresAt = now() + ms;
    e.source = source;
    save(e);
    return snapshot();
  }

  function setProActive(source='stripe'){
    const e = load();
    e.pro = true; e.source = source;
    save(e);
    return snapshot();
  }

  function clear(){
    localStorage.removeItem(KEY);
  }

  // Guards
  function canUse(feature){
    const s = snapshot();
    const proOnly = new Set(['pro-posters','ambient-audio','advanced-levels','leaderboards']);
    if (proOnly.has(feature)) return s.pro;
    return true;
  }

  return { snapshot, grantTrial, setProActive, clear, canUse };
})();
