// /scripts/posters.js — v9007 (clean)
const MANIFEST_URL = '/posters.json?v=9007';

let POSTERS = null;

/** Load and cache the manifest once per page load. */
async function loadPosterManifest() {
  if (POSTERS) return POSTERS;

  try {
    // Try version-busted URL first; fall back to plain if needed.
    let res = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!res.ok) {
      console.warn(`[posters] ${MANIFEST_URL} -> HTTP ${res.status}; trying /posters.json`);
      res = await fetch('/posters.json', { cache: 'no-store' });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    POSTERS = await res.json();
    if (!POSTERS || !Array.isArray(POSTERS.items)) {
      throw new Error('Malformed manifest (missing items[])');
    }
  } catch (err) {
    console.warn('[posters] failed to load manifest:', err);
    POSTERS = { v: 0, items: [] };
  }
  return POSTERS;
}

/** Find entry by id; warns if not found. */
function findPosterById(id) {
  const entry = (POSTERS?.items || []).find(p => p.id === id);
  if (!entry) console.warn('[posters] id not found:', id);
  return entry || { id, src: '', thumb: '' };
}

/** Remove any existing overlay so we never stack multiples. */
function removeExistingOverlay() {
  const existing = document.querySelector('.whylee-poster-overlay');
  if (existing) existing.remove();
}

/**
 * Show a poster overlay by id from posters.json.
 * @param {string} id - Poster id in posters.json
 * @param {{autohide?: number}} options
 */
export async function showPoster(id, { autohide = 0 } = {}) {
  await loadPosterManifest();
  const meta = findPosterById(id);
  if (!meta.src) return;

  removeExistingOverlay();

  const overlay = document.createElement('div');
  overlay.className = 'whylee-poster-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; display: grid; place-items: center;
    background: rgba(0,0,0,.68); z-index: 9999; opacity: 0;
    transition: opacity .25s ease;
  `;

  const frame = document.createElement('div');
  frame.style.width = 'min(90vw, 1280px)';
  frame.style.maxHeight = '90vh';
  frame.style.aspectRatio = '16/9';
  frame.style.borderRadius = '20px';
  frame.style.boxShadow = '0 12px 48px rgba(0,0,0,.65)';
  frame.style.background = meta.thumb
    ? `center / cover no-repeat url("${meta.thumb}")`
    : '#0b1724';
  frame.style.overflow = 'hidden';

  // Preload full image
  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = meta.src;
  img.alt = '';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.opacity = '0';
  img.style.transition = 'opacity .25s ease';

  img.onload = () => {
    frame.style.background = 'none';
    frame.appendChild(img);
    requestAnimationFrame(() => (img.style.opacity = '1'));
  };
  img.onerror = (e) => {
    console.warn('[posters] image failed to load:', meta.src, e);
  };

  // Close interactions
  const close = () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 260);
    window.removeEventListener('keydown', onKey);
  };
  const onKey = (ev) => { if (ev.key === 'Escape') close(); };
  window.addEventListener('keydown', onKey);
  overlay.addEventListener('click', close);

  overlay.appendChild(frame);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => (overlay.style.opacity = '1'));

  if (autohide > 0) setTimeout(() => overlay.isConnected && close(), autohide);
}

// Expose globally for legacy calls (e.g., in game.js)
window.WhyleePoster = { showPoster };
