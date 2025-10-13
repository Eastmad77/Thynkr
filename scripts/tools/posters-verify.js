/**
 * Quick dev checker (run in browser console or include with type="module")
 * Logs missing poster files vs manifest.
 */
(async () => {
  async function head(url) {
    try { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); return r.ok; }
    catch { return false; }
  }
  const res = await fetch('/media/posters/manifest.json?v=7000', { cache: 'no-store' });
  const m = await res.json();
  let missing = 0;
  for (const p of m.posters) {
    const url = `/media/posters/${p.file}`;
    const ok = await head(url);
    console.log(ok ? '✅' : '❌', p.key, '→', p.file);
    if (!ok) missing++;
  }
  if (missing === 0) {
    console.log('All posters present ✔');
  } else {
    console.warn(`Missing ${missing} poster(s). Check filenames and paths.`);
  }
})();
