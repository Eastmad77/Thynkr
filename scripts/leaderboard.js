// leaderboard.js
import {
  db, collection, query, orderBy, limit, getDocs
} from "./firebase-bridge.js";

const list = document.querySelector("#leaderboardList");

(async function render() {
  const q = query(collection(db, "leaders"), orderBy("weeklyXp","desc"), limit(50));
  const snap = await getDocs(q);

  list.innerHTML = "";
  snap.forEach(docSnap => {
    const row = docSnap.data(); // { uid, displayName, avatarId, emoji, weeklyXp }
    const li = document.createElement("li");
    li.className = "lb-row";

    const avatarSrc = avatarPath(row.avatarId || "fox");
    const em = row.emoji || fallbackEmoji(row.avatarId);

    li.innerHTML = `
      <img class="lb-ava" src="${avatarSrc}" alt="" loading="lazy" decoding="async">
      <span class="lb-name">${escapeHtml(row.displayName || "Player")}</span>
      <span class="lb-emoji">${em || ""}</span>
      <span class="lb-xp">${row.weeklyXp ?? 0} XP</span>
    `;
    list.appendChild(li);
  });
})();

function avatarPath(id) {
  const map = {
    fox: "/media/avatars/fox-default.png",
    cat: "/media/avatars/cat-pro.png",
    panda: "/media/avatars/panda-pro.png",
    owl: "/media/avatars/owl-pro.png",
    tiger: "/media/avatars/tiger-pro.png",
    bear: "/media/avatars/bear-pro.png",
    dragon:"/media/avatars/dragon-pro.png",
    wolf: "/media/avatars/wolf-pro.png",
  };
  return map[id] || map.fox;
}

function fallbackEmoji(id) {
  const map = { fox:"🦊", cat:"🐱", panda:"🐼", owl:"🦉", tiger:"🐯", bear:"🐻", dragon:"🐲", wolf:"🐺" };
  return map[id] || "✨";
}

function escapeHtml(s){ return (s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }
