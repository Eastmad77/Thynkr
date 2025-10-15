// scripts/firebase-bridge.js — v7000
(async () => {
  try {
    const mod = await import('/firebase-config.js'); // exports: app, db, messaging
    window.WHYLEE_DB = mod.db;
    window.dispatchEvent(new Event('whylee:db-ready'));
  } catch (e) {
    console.warn('[firebase-bridge] No Firebase db available yet.', e);
  }
})();
