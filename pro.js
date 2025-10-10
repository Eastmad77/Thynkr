/* Whylee Pro Helpers v6004 */
(() => {
  const KEY = 'whylee:pro';
  function isPro(){ return localStorage.getItem(KEY) === '1'; }
  function setPro(v){ localStorage.setItem(KEY, v ? '1' : '0'); }
  // Expose
  window.WhyleePro = { isPro, setPro };
})();
