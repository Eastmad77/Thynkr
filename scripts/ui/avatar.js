/**
 * Whylee — Avatar Renderer (v7006)
 * Renders avatar base image, animated progress ring, and optional badge overlay.
 * Works with:
 *   /styles/avatar.css
 *   /styles/avatar-badge.css
 *
 * Usage (HTML):
 *   <div class="avatar-wrap" data-tier="pro" data-progress="42" data-base="/media/avatars/profile-pro-gold.svg" data-badge="/media/badges/crown-gold.svg" data-dot></div>
 *
 * Or programmatically:
 *   import { renderAvatar } from '/scripts/ui/avatar.js?v=7006';
 *   renderAvatar(el, { tier:'pro', progress:42, badge:'/media/badges/crown-gold.svg', baseSrc:'/media/avatars/profile-pro-gold.svg', showDot:true });
 */

// ---- Public API -------------------------------------------------------------

/**
 * Render/refresh a single avatar element.
 * @param {HTMLElement} el - The .avatar-wrap element
 * @param {Object} opts
 * @param {'free'|'pro'|'leader'} [opts.tier='free']
 * @param {number} [opts.progress=0] - 0..100 → ring sweep
 * @param {string|null} [opts.badge=null] - URL to badge SVG/PNG (e.g., /media/badges/crown-gold.svg)
 * @param {string|null} [opts.baseSrc=null] - Base avatar image URL
 * @param {boolean} [opts.showDot=false] - Whether to show the notification/online dot
 */
export function renderAvatar(el, {
  tier = 'free',
  progress = 0,
  badge = null,
  baseSrc = null,
  showDot = false
} = {}) {
  if (!el) return;

  // Ensure structure exists (idempotent)
  hydrate(el);

  // Tier classes
  el.classList.remove('tier-free', 'tier-pro', 'tier-leader');
  el.classList.add(`tier-${tier}`);

  // Base image
  const base = el.querySelector('.avatar-base');
  if (base && baseSrc) {
    // Avoid repaint if identical
    if (base.currentSrc !== baseSrc && base.getAttribute('src') !== baseSrc) {
      base.setAttribute('src', baseSrc);
    }
  }

  // Progress ring
  const deg = clamp(progress, 0, 100) * 3.6; // 0..360
  const ring = el.querySelector('.avatar-ring');
  if (ring) {
    const styles = getComputedStyle(el);
    const color =
      tier === 'pro' ? styles.getPropertyValue('--ring-pro').trim() :
      tier === 'leader' ? styles.getPropertyValue('--ring-leader').trim() :
      styles.getPropertyValue('--ring-free').trim() || '#3A5E7A';
    ring.style.background = `conic-gradient(${color} ${deg}deg, rgba(255,255,255,.08) ${deg}deg)`;
  }

  // Badge overlay
  const badgeEl = el.querySelector('.avatar-badge');
  if (badgeEl) {
    if (badge) {
      badgeEl.style.display = 'block';
      if (badgeEl.getAttribute('src') !== badge) badgeEl.setAttribute('src', badge);
      el.classList.add('has-badge');
    } else {
      badgeEl.style.display = 'none';
      el.classList.remove('has-badge');
    }
  }

  // Notification dot
  const dot = el.querySelector('.avatar-dot');
  if (dot) el.classList.toggle('has-dot', !!showDot);
}

/**
 * Render/refresh all avatars on the page that declare data-* attributes.
 * Useful after route changes or dynamic lists.
 */
export function renderAllAvatars() {
  document.querySelectorAll('.avatar-wrap').forEach((wrap) => {
    const tier = (wrap.getAttribute('data-tier') || 'free').toLowerCase();
    const progress = Number(wrap.getAttribute('data-progress') || '0');
    const badge = attrOrNull(wrap, 'data-badge');
    const baseSrc = attrOrNull(wrap, 'data-base');
    const showDot = wrap.hasAttribute('data-dot');

    renderAvatar(wrap, { tier, progress, badge, baseSrc, showDot });
  });
}

// ---- Internal helpers -------------------------------------------------------

function hydrate(el) {
  // Ensure base image exists
  let base = el.querySelector('.avatar-base');
  if (!base) {
    base = document.createElement('img');
    base.className = 'avatar-base';
    base.alt = 'User avatar';
    base.decoding = 'async';
    base.loading = 'lazy';
    base.src = el.getAttribute('data-base') || defaultBaseForTier(el.getAttribute('data-tier'));
    el.appendChild(base);
  }

  // Ensure ring exists
  if (!el.querySelector('.avatar-ring')) {
    const ring = document.createElement('div');
    ring.className = 'avatar-ring';
    ring.setAttribute('aria-hidden', 'true');
    el.appendChild(ring);
  }

  // Ensure badge exists
  if (!el.querySelector('.avatar-badge')) {
    const badge = document.createElement('img');
    badge.className = 'avatar-badge';
    badge.setAttribute('aria-hidden', 'true');
    const src = el.getAttribute('data-badge');
    if (src) badge.src = src;
    else badge.style.display = 'none';
    el.appendChild(badge);
  }

  // Ensure dot exists
  if (!el.querySelector('.avatar-dot')) {
    const dot = document.createElement('span');
    dot.className = 'avatar-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.style.display = 'none';
    el.appendChild(dot);
  }
}

function defaultBaseForTier(tierRaw) {
  const tier = (tierRaw || 'free').toLowerCase();
  if (tier === 'pro')    return '/media/avatars/profile-pro-gold.svg';
  if (tier === 'leader') return '/media/avatars/profile-pro-silver.svg';
  return '/media/avatars/profile-default.svg';
}

function attrOrNull(el, name) {
  const v = el.getAttribute(name);
  return v === null ? null : v;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ---- Auto-init --------------------------------------------------------------

// Enhance any avatars present on initial load.
document.addEventListener('DOMContentLoaded', () => {
  // If profile/leaderboard set streak/tier in storage, reflect progress ring:
  const streak = Number(localStorage.getItem('wl_streak') || '0') % 100;

  document.querySelectorAll('.avatar-wrap').forEach((wrap) => {
    // Fill defaults if attributes missing
    if (!wrap.hasAttribute('data-tier')) wrap.setAttribute('data-tier', 'free');
    if (!wrap.hasAttribute('data-progress')) wrap.setAttribute('data-progress', String(streak));
    if (!wrap.hasAttribute('data-base')) wrap.setAttribute('data-base', defaultBaseForTier(wrap.getAttribute('data-tier')));

    // If tier suggests a default badge (optional heuristic)
    const tier = (wrap.getAttribute('data-tier') || 'free').toLowerCase();
    if (!wrap.hasAttribute('data-badge')) {
      if (tier === 'pro') wrap.setAttribute('data-badge', '/media/badges/crown-gold.svg');
      else if (tier === 'leader') wrap.setAttribute('data-badge', '/media/badges/star-silver.svg');
    }

    // Render it
    renderAvatar(wrap, {
      tier,
      progress: Number(wrap.getAttribute('data-progress') || '0'),
      badge: attrOrNull(wrap, 'data-badge'),
      baseSrc: attrOrNull(wrap, 'data-base'),
      showDot: wrap.hasAttribute('data-dot')
    });

    // Entrance
    wrap.classList.add('pop-in');
  });
});
