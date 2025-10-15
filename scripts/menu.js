// scripts/menu.js — v7000
import { Entitlements } from './entitlements.js';

function init() {
  const isPro = Entitlements.isPro?.() || false;
  const proLink = Array.from(document.querySelectorAll('.menu a'))
    .find(a => /pro\.html$/.test(a.getAttribute('href') || ''));

  if (isPro && proLink) {
    proLink.textContent = 'Pro (Active)';
    proLink.classList.add('muted');
  }

  // Optional: show trial badge
  const t = Entitlements.trialStatus?.();
  if (t?.active && proLink) {
    const badge = document.createElement('span');
    badge.className = 'tag';
    badge.textContent = `Trial: ${t.remaining}d left`;
    badge.style.marginLeft = '8px';
    proLink.after(badge);
  }
}

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('wl:pro', init);
window.addEventListener('wl:trial', init);
