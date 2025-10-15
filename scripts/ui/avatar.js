// /scripts/ui/avatar.js
export function renderAvatar(container, opts = {}) {
  const {
    tier = 'free',                 // 'free' | 'pro' | 'leader'
    progress = 0,                  // 0..100
    badge = null,                  // '#crown-gold' (symbol id) or absolute path
    size = 64,                     // px
    useSprite = true               // prefer inline sprite
  } = opts;

  // Ensure container baseline
  container.classList.add('avatar-wrap');
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  container.dataset.tier = tier;
  container.dataset.progress = progress;

  // Clear previous contents
  container.innerHTML = '';

  // Inline sprite path
  const SPRITE = '/media/avatars/avatars-sprite.svg';

  // Decide avatar symbol
  const idByTier = {
    free:   'avatar-default',
    pro:    'avatar-pro-gold',
    leader: 'avatar-leader'
  };
  const symbolId = idByTier[tier] || idByTier.free;

  // Render avatar
  if (useSprite) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'avatar-icn');
    svg.setAttribute('viewBox', '0 0 64 64');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `${SPRITE}#${symbolId}`);
    svg.appendChild(use);
    container.appendChild(svg);
  } else {
    // Fallback to image files (keeps compatibility with old setup)
    const img = new Image();
    img.className = 'avatar-icn';
    img.width = size; img.height = size;
    img.alt = 'Profile avatar';
    img.src = ({
      free:   '/media/avatars/profile-default.svg',
      pro:    '/media/avatars/profile-pro-gold.svg',
      leader: '/media/avatars/profile-leader.svg'
    })[tier] || '/media/avatars/profile-default.svg';
    container.appendChild(img);
  }

  // Add ambient ring
  const ring = document.createElement('div');
  ring.className = 'avatar-ring';
  container.appendChild(ring);

  // Optional progress arc
  if (progress > 0) {
    const arc = document.createElement('div');
    arc.className = 'avatar-progress';
    arc.style.setProperty('--pct', Math.max(0, Math.min(100, progress)));
    container.appendChild(arc);
  }

  // Optional badge (crown)
  const shouldBadge = tier === 'leader' || !!badge;
  if (shouldBadge) {
    const crownWrap = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    crownWrap.setAttribute('class', 'avatar-badge');
    crownWrap.setAttribute('viewBox', '0 0 24 24');
    const useC = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    const crownRef = badge && badge.startsWith('#') ? badge : '#crown-gold';
    useC.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `${SPRITE}${crownRef}`);
    crownWrap.appendChild(useC);
    container.appendChild(crownWrap);
  }
}

// Convenience: hydrate all .avatar-wrap elements by data-attributes
export function hydrateAvatars() {
  document.querySelectorAll('.avatar-wrap').forEach(el => {
    renderAvatar(el, {
      tier: el.dataset.tier || 'free',
      progress: Number(el.dataset.progress || 0),
      badge: el.dataset.badge || null,
      size: Number(el.dataset.size || 64),
      useSprite: true
    });
  });
}

// Auto-init on DOM ready if any .avatar-wrap present
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.avatar-wrap')) hydrateAvatars();
});
