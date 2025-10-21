// /scripts/components/avatarBadge.js
// Renders a small avatar pill with ring/badge; live updates via onSnapshot.

import { auth, db, doc, onSnapshot } from "/scripts/firebase-bridge.js";

export async function mountAvatarBadge(target, opts = {}) {
  const root = typeof target === "string" ? document.querySelector(target) : target;
  if (!root) return;

  const size = opts.size ?? 56;
  const uid  = opts.uid ?? auth.currentUser?.uid;

  root.innerHTML = `
    <div class="avatar-badge" style="width:${size}px;height:${size}px;border-radius:12px;overflow:hidden;background:rgba(255,255,255,.06);display:grid;place-items:center">
      <img id="avaImg" alt="avatar" style="width:100%;height:100%;object-fit:cover;display:block"/>
    </div>
  `;

  const img = root.querySelector("#avaImg");
  img.src = "/media/avatars/profile-default.svg";

  if (!uid) return;

  // Live user doc for avatarSrc changes
  const ref = doc(db, "users", uid);
  onSnapshot(ref, (snap) => {
    const d = snap.data() || {};
    img.src = d.avatarSrc || "/media/avatars/profile-default.svg";
  });
}
