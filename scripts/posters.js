// /scripts/posters.js — v7002
let POSTERS = null;

async function loadPosterManifest() {
  if (POSTERS) return POSTERS;
  try {
    const res = await fetch('/posters.json?v=7002', { cache: 'no-store' });
    POSTERS = await res.json();
  } catch (e) {
    console.warn('[posters] failed to load manifest', e);
    POSTERS = { v: 0, items: [] };
  }
  return POSTERS;
}

function findPosterById(id) {
  const entry = (POSTERS?.items || []).find(p => p.id === id);
  if (!entry) console.warn('[posters] id not found:', id);
  return entry || { id, src: '', thumb: '' };
}

export async function showPoster(id, { autohide = 0 } = {}) {
  await loadPosterManifest();
  const meta = findPosterById(id);
  if (!meta.src) return;

  const overlay = document.createElement('div');
  overlay.className = 'overlay-poster';
  overlay.addEventListener('click', () => {
    overlay.setAttribute('closing', '');
    setTimeout(() => overlay.remove(), 380);
  });

  // Thumb-first (LQIP) background, then upgrade to full res
  const frame = document.createElement('div');
  frame.style.width = 'min(90vw, 1280px)';
  frame.style.maxHeight = '90vh';
  frame.style.aspectRatio = '16/9';
  frame.style.borderRadius = '20px';
  frame.style.boxShadow = '0 12px 48px rgba(0,0,0,.65)';
  frame.style.background = meta.thumb
    ? `center / cover no-repeat url("${meta.thumb}")`
    : '#0b1724';

  const img = new Image();
  img.decoding = 'async';
  img.loading = 'eager';
  img.src = meta.src;
  img.alt = '';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.borderRadius = '20px';
  img.style.opacity = '0';
  img.style.transition = 'opacity .25s ease';

  img.onload = () => {
    frame.style.background = 'none';
    frame.appendChild(img);
    requestAnimationFrame(() => (img.style.opacity = '1'));
  };

  overlay.appendChild(frame);
  document.body.appendChild(overlay);

  if (autohide > 0) {
    setTimeout(() => {
      if (overlay.isConnected) {
        overlay.setAttribute('closing', '');
        setTimeout(() => overlay.remove(), 380);
      }
    }, autohide);
  }
}

// Expose globally for legacy calls in game.js
window.WhyleePoster = { showPoster };
