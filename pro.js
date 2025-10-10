// pro.js — local Pro toggle + helpers (no backend required)
window.WhyleePro = (function(){
  const KEY = 'wl_pro_enabled';
  function isPro(){ return localStorage.getItem(KEY) === '1'; }
  function setPro(v){ localStorage.setItem(KEY, v ? '1' : '0'); return v; }
  return { isPro, setPro };
})();
