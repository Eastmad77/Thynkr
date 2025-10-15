// scripts/profile.js — v7000
import { Achievements } from './achievements.js';

function getDayStreak() { return Number(localStorage.getItem('wl_daystreak') || '0'); }

function $(s){ return document.querySelector(s); }

function render() {
  const name = localStorage.getItem('wl_username') || 'Guest';
  const avatar = localStorage.getItem('wl_avatar') || '/media/avatars/fox-default.png';
  const xp = Achievements.state.xp;
  const sessionStreak = Achievements.state.streak;
  const dayStreak = getDayStreak();

  const nameEl = $('#username');
  const streakEl = $('#streak-count');
  const xpEl = $('#xp-count');
  const img = document.querySelector('.profile-card .avatar');

  if (nameEl) nameEl.textContent = name;
  if (streakEl) streakEl.textContent = `${dayStreak} day${dayStreak===1?'':'s'}`;
  if (xpEl) xpEl.textContent = xp;
  if (img) img.src = avatar;

  // quick avatar switcher if thumbnail row exists
  document.querySelectorAll('[data-avatar]').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('wl_avatar', btn.dataset.avatar);
      render();
    });
  });

  // sign-in button goes to Sign-in page
  const signInBtn = document.getElementById('sign-in-btn') || document.getElementById('google-login');
  if (signInBtn) signInBtn.addEventListener('click', () => location.href = '/sign-in.html');
}

window.addEventListener('DOMContentLoaded', render);
window.addEventListener('wl:pro', render);
window.addEventListener('wl:badge', render);
window.addEventListener('wl:day-complete', render);
