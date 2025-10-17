// /scripts/leaderboard.js
import { auth, db, collection, query, orderBy, limit, getDocs, onAuthStateChanged } from "./firebase-bridge.js";

const list = document.getElementById("leaderboardList");
const FALLBACK_AVA = "/media/avatars/profile-default.svg";

function rowTemplate(rank, user) {
  const img = user.avatarUrl || user.avatarImg || FALLBACK_AVA; // optional precomputed URL
  const emoji = user.emoji || "⭐";
  const name = user.displayName || "Player";
  const xp = Number(user.xp || 0).toLocaleString();

  return `
    <li class="lb-row">
      <div class="lb-rank">${rank}</div>
      <img class="lb-ava" src="${img}" alt="" />
      <div class="lb-name">${emoji} ${name}</div>
      <div class="lb-xp">${xp} XP</div>
    </li>
  `;
}

async function loadTop() {
  // Expect a "users" collection with xp counters. You can adapt to your schema.
  const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(100));
  const snap = await getDocs(q);

  const items = [];
  let rank = 1;
  snap.forEach(doc => {
    const d = doc.data();
    // Resolve avatar image: if you store just avatarId, map it to a path
    const avatarId = d.avatarId || "fox-default";
    const avatarImg = `/media/avatars/${avatarId}.png`;
    items.push(rowTemplate(rank++, { ...d, avatarImg }));
  });

  list.innerHTML = items.join("");
}

onAuthStateChanged(auth, () => {
  // Leaderboard can show even for signed-out users; no redirect needed.
  loadTop().catch(err => {
    console.error(err);
    list.innerHTML = `<li class="lb-row">Could not load leaderboard.</li>`;
  });
});
