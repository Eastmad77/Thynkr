// Whylee — avatar renderer (v7005)
export function renderAvatar(el, {
  tier = 'free',            // 'free' | 'pro' | 'leader'
  progress = 0,             // 0..100 → ring sweep
  badge = null,             // e.g. '/media/badges/crown-gold.svg'
  baseSrc = null,           // override avatar image src
  showDot = false           // show notification/online dot
} = {}) {
  if (!el) return;

  // CSS tier class
  el.classList.remove('tier-free','tier-pro','tier-leader');
  el.classList.add(`tier-${tier}`);

  // Base avatar
  const base = el.querySelector('.avatar-base');
  if (base && baseSrc) base.src = baseSrc;

  // Progress ring
  const deg = Math.max(0, Math.min(100, progress)) * 3.6;
  const ring = el.querySelector('.avatar-ring');
  if (ring) {
    const styles = getComputedStyle(el);
    const color =
      (tier === 'pro') ? styles.getPropertyValue('--ring-pro').trim() :
      (tier === 'leader') ? styles.getPropertyValue('--ring-leader').trim() :
      styles.getPropertyValue('--ring-free').trim() || '#3A5E7A';
    ring.style.background = `conic-gradient(${color} ${deg}deg, rgba(255,255,255,.08) ${deg}deg)`;
  }

  // Badge layer
  const badgeEl = el.querySelector('.avatar-badge');
  if (badgeEl) {
    if (badge) { badgeEl.style.display = 'block'; badgeEl.src = badge; }
    else { badgeEl.style.display = 'none'; }
  }

  // Notification dot
  const dot = el.querySelector('.avatar-dot');
  if (dot) dot.style.display = showDot ? 'block' : 'none';
}

// Auto-init (optional): enhance any .avatar-wrap[data-tier]
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.avatar-wrap[data-tier]').forEach((wrap) => {
    const tier = (wrap.getAttribute('data-tier') || 'free').toLowerCase();
    const progress = Number(wrap.getAttribute('data-progress') || '0');
    const badge = wrap.getAttribute('data-badge') || null;
    const base = wrap.getAttribute('data-base') || null;
    const dot = wrap.hasAttribute('data-dot');

    renderAvatar(wrap, {
      tier, progress, badge, baseSrc: base, showDot: dot
    });
    wrap.classList.add('pop-in');
  });
});
