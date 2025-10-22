// /scripts/posters.js — v9007
// Poster loader and overlay display for Whylee App
// Handles poster.json manifest + smooth overlay display with cache busting

const VERSION = '9007';
let POSTERS = null;

// Inject fallback overlay CSS if global stylesheet is missing
(function ensurePosterStyles() {
  if (document.getElementById('poster-overlay-style')) return;
  const css = `
    .overlay-poster {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(2px);
      z-index: 9999;
      opacity: 1;
      transition: opacity .25s ease;
    }
    .overlay-poster[closing] { opacity: 0; pointer-events: none; }
  `;
  const style = document.createElement('style');
  style.id = 'poster-overlay-style';
  style.textContent = css;
  document.head.appendChild(style);
})();

// Cache-buster generator
function cacheBuster() {
  return `v=${VERSION}&t=${Date.now()}`;
}

// Load JSON with versioned fetch
async function fetchJSON(url) {
  const fullURL = url + (url.includes('?') ? '&' : '?') + cacheBuster();
  const res = await fetch(fullURL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function loadPosterManifest() {
  if (POSTERS) return POSTERS;
  try {
    POSTERS = await fetchJSON('/posters.json');
    if (!POSTERS || !Array.isArray(POSTERS.items))
      throw new Error('Invalid poster manifest format');
  } catch (e) {
    console.warn('[posters] Failed to load manifest:', e);
    POSTERS = { v: 0, items: [] };
  }
  return POSTERS;
}

function findPosterById(id) {
  const list = (POSTERS?.items || []);
  const entry = list.find(p => p.id === id);
  if (!entry) console.warn('[posters] id not found:', id);
  return entry || { id, src: '', thumb: '' };
}

// Optional preloader (helps avoid blank flash)
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

// Show overlay poster
export async function showPoster(id, { autohide = 0 } = {}) {
  await loadPosterManifest();
  const meta = findPosterById(id);
  if (!meta.src) return;

  if (document.querySelector('.overlay-poster')) return; // avoid duplicates

  const overlay = document.createElement('div');
  overlay.className = 'overlay-poster';

  const close = () => {
    if (!overlay.isConnected) return;
    overlay.setAttribute('closing', '');
    setTimeout(() => overlay.remove(), 220);
    window.removeEventListener('keydown', onKey);
  };

  const onKey = e => { if (e.key === 'Escape') close(); };
  window.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  const frame = document.createElement('div');
  frame.style.width = 'min(90vw, 1280px)';
  frame.style.maxHeight = '90vh';
  frame.style.aspectRatio = '16/9';
  frame.style.borderRadius = '20px';
  frame.style.boxShadow = '0 12px 48px rgba(0,0,0,.65)';
  frame.style.background = meta.thumb
    ? `center / cover no-repeat url("${meta.thumb}")`
    : 'rgba(0,0,0,0.35)';
  frame.style.overflow = 'hidden';

  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';
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
    requestAnimationFrame(() => { img.style.opacity = '1'; });
  });

  overlay.appendChild(frame);
  document.body.appendChild(overlay);

  if (autohide > 0) {
    setTimeout(() => { if (overlay.isConnected) close(); }, autohide);
  }
}

// Expose globally for any legacy game calls
window.WhyleePoster = { showPoster, preloadPoster };
