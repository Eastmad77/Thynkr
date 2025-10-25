// test/csp-check.js — runs with strict CSP (no inline JS needed)
const ul = document.querySelector('#status');
const out = document.querySelector('#console');
const log = (msg) => {
  const li = document.createElement('li');
  li.textContent = msg;
  ul.appendChild(li);
};
const clog = (...a) => { out.textContent += a.join(' ') + '\n'; };

(async () => {
  try {
    // 1) firebaseConfig present?
    const hasCfg = !!window.firebaseConfig;
    log(`firebaseConfig present … ${hasCfg ? '✅' : '❌'}`);
    if (!hasCfg) clog('firebaseConfig missing — check /scripts/firebase-config.js order.');

    // 2) Load the bridge after config
    try {
      await import('/scripts/firebase-bridge.js?v=9007');
      log('firebase-bridge loaded … ✅');
    } catch (e) {
      log('firebase-bridge loaded … ❌');
      clog('bridge import error:', e);
    }

    // 3) Network probes allowed by CSP
    try { await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors' }); log('connect to www.gstatic.com … ✅'); }
    catch { log('connect to www.gstatic.com … ❌'); }

    try { await fetch('https://www.googleapis.com/generate_204', { mode: 'no-cors' }); log('connect to www.googleapis.com … ✅'); }
    catch { log('connect to www.googleapis.com … ❌'); }

    // 4) Posters manifest & one image
    try {
      const res = await fetch('/posters.json?v=9007', { cache: 'no-store' });
      log('load /posters.json … ' + (res.ok ? '✅' : `❌ (HTTP ${res.status})`));
      if (res.ok) {
        const data = await res.json();
        const first = data.items?.[0];
        if (first?.src) {
          try { await fetch(first.src, { mode: 'no-cors' }); log('load poster image … ✅'); }
          catch { log('load poster image … ❌'); }
        } else {
          log('load poster image … ❌ (no items)');
        }
      }
    } catch (e) {
      log('load /posters.json … ❌'); clog(e);
    }
  } catch (e) {
    clog('fatal:', e);
  }
})();
