// scripts/leaderboard.js — v7000
import { Achievements } from './achievements.js';

const LIST_ID = 'leaderboard-list';

function render(items) {
  const ul = document.getElementById(LIST_ID);
  if (!ul) return;
  ul.innerHTML = items.map((u, i) => `
    <li class="lb-item">
      <span class="rank">#${i + 1}</span>
      <img class="avatar" src="${u.avatar || '/media/avatars/fox-default.png'}" alt="" />
      <span class="name">${u.name || 'Player'}</span>
      <span class="xp">${u.xp ?? 0} XP</span>
      <span class="streak">${u.streak ?? 0}🔥</span>
    </li>
  `).join('');
}

async function fetchFirestoreTop() {
  try {
    if (!window.WHYLEE_DB) return null;
    const { getDocs, query, collection, orderBy, limit } =
      await import('https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js');
    const q = query(collection(window.WHYLEE_DB, 'leaderboard'), orderBy('xp', 'desc'), limit(50));
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach(d => rows.push(d.data()));
    return rows;
  } catch (e) {
    console.warn('[leaderboard] Firestore read failed', e);
    return null;
  }
}

async function init() {
  let data = await fetchFirestoreTop();
  if (!data || !data.length) {
    // Fallback: show local user only
    const me = {
      name: localStorage.getItem('wl_username') || 'You',
      avatar: localStorage.getItem('wl_avatar') || '/media/avatars/fox-default.png',
      xp: Achievements.state.xp,
      streak: Achievements.state.streak
    };
    data = [me];
  }
  render(data);
}

window.addEventListener('whylee:db-ready', init);
window.addEventListener('DOMContentLoaded', init);
