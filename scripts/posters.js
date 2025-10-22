// /scripts/posters.js — v9006
// Lightweight poster manifest loader + simple overlay viewer.

const VERSION = '9007';
let POSTERS = null;

// Ensure basic overlay styles exist even if global CSS is missing.
(function ensurePosterStyles() {
  if (document.getElementById('poster-overlay-style')) return;
  const css = `
    .overlay-poster{
      position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.55); backdrop-filter: blur(2px); z-index:9999;
      opacity:1; transition:opacity .25s ease;
    }
    .overlay-poster[closing]{ opacity:0; pointer-events:none; }
  `;
  const style = document.createElement('style');
  style.id = 'poster-overlay-style';
  style.textContent = css;
  document.head.appendChild(style);
})();

function cacheBuster() {
  return `v=${encodeURIComponent(VERSION)}&t=${Date.now()}`; // force SW/CDN refresh
}

async function fetchJSON(url) {
  const withBust = url + (url.includes('?') ? '&' : '?') + cacheBuster();
  const res = await fetch(withBust, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadPosterManifest() {
  if (POSTERS) return POSTERS;
  try {
    POSTERS = await fetchJSON('/posters.json');
    if (!POSTERS || !Array.isArray(POSTERS.items)) {
      throw new Error('malformed manifest');
    }
  } catch (e) {
    console.warn('[posters] failed to load manifest:', e);
    POSTERS = { v: 0, items: [] };
  }
  return POSTERS;
}

function findPosterById(id) {
  const list = (POSTERS && Array.isArray(POSTERS.items)) ? POSTERS.items : [];
  const found = list.find(p => p && p.id === id);
  if (!found) console.warn('[posters] id not found:', id);
  return found || { id, src: '', thumb: '' };
}

// Optional preloader you can call ahead of time
export async function preloadPoster(id) {
  await loadPosterManifest();
  const { src, thumb } = findPosterById(id);
  [thumb, src].filter(Boolean).forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href + (href.includes('?') ? '&' : '?') + cacheBuster();
    document.head.appendChild(link);
  });
}

export async function showPoster(id, { autohide = 0 } = {}) {
  await loadPosterManifest();
  const meta = findPosterById(id);
  if (!meta.src) return;

  // Prevent duplicates if user spams clicks
  if (document.querySelector('.overlay-poster')) return;

  const overlay = document.createElement('div');
  overlay.className = 'overlay-poster';

  const close = () => {
    if (!overlay.isConnected) return;
    overlay.setAttribute('closing', '');
    setTimeout(() => overlay.remove(), 220);
    window.removeEventListener('keydown', onKey);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (ev) => {
    // only close on backdrop click, not on image itself
    if (ev.target === overlay) close();
  });

  // Frame
  const frame = document.createElement('div');
  frame.style.width = 'min(90vw, 1280px)';
  frame.style.maxHeight = '90vh';
  frame.style.aspectRatio = '16/9';
  frame.style.borderRadius = '20px';
  frame.style.boxShadow = '0 12px 48px rgba(0,0,0,.6)';
  frame.style.background = meta.thumb
    ? `center / cover no-repeat url("${meta.thumb}")`
    : 'rgba(0,0,0,0.35)';
  frame.style.overflow = 'hidden';

  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';
  // add cache-buster to image URLs too
  img.src = meta.src + (meta.src.includes('?') ? '&' : '?') + cacheBuster();
  img.alt = '';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.display = 'block';
  img.style.opacity = '0';
  img.style.transition = 'opacity .25s ease';

  img.addEventListener('load', () => {
    frame.style.background = 'transparent';
    frame.appendChild(img);
    // next microtask to ensure CSS transition triggers
    requestAnimationFrame(() => { img.style.opacity = '1'; });
  });

  overlay.appendChild(frame);
  document.body.appendChild(overlay);

  if (autohide > 0) {
    setTimeout(() => {
      if (overlay.isConnected) close();
    }, autohide);
  }
}

// Expose globally for any legacy callers (e.g., old game code)
window.WhyleePoster = { showPoster, preloadPoster };
