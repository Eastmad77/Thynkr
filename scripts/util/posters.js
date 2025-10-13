/**
 * Whylee Posters Loader (no framework; tiny & resilient)
 * - Reads /media/posters/manifest.json
 * - Provides getPoster(key) and prefetchPosters(keys?)
 * - Falls back to manifest.fallback if a specific file is missing
 */
export const Posters = (() => {
  const MANIFEST_URL = '/media/posters/manifest.json?v=7000';
  let manifest = null;

  async function loadManifest() {
    if (manifest) return manifest;
    try {
      const res = await fetch(MANIFEST_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('manifest fetch failed');
      manifest = await res.json();
    } catch {
      // minimal fallback
      manifest = {
        version: 1,
        posters: [{ key: 'start', file: '/media/posters/poster-start.jpg' }],
        fallback: '/media/posters/poster-start.jpg'
      };
    }
    return manifest;
  }

  async function fileExists(url) {
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return res.ok;
    } catch { return false; }
  }

  async function getPoster(key) {
    const m = await loadManifest();
    const item = m.posters.find(p => p.key === key);
    if (!item) return m.fallback || '/media/posters/poster-start.jpg';
    const url = `/media/posters/${item.file}`;
    return (await fileExists(url)) ? url : (m.fallback || '/media/posters/poster-start.jpg');
  }

  async function prefetchPosters(keys) {
    const m = await loadManifest();
    const pick = (keys && keys.length)
      ? m.posters.filter(p => keys.includes(p.key))
      : m.posters;
    pick.forEach(p => {
      const img = new Image();
      img.decoding = 'async';
      img.src = `/media/posters/${p.file}`;
    });
  }

  return { loadManifest, getPoster, prefetchPosters };
})();
