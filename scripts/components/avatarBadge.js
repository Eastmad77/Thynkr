/**
 * Whylee • AvatarBadge Component (v8)
 * Path: /scripts/components/avatarBadge.js
 *
 * Renders a compact user chip with:
 *  - Avatar image (32–72px)
 *  - Emoji badge
 *  - Circular XP progress ring (to next level)
 *  - Streak chip (🔥 7)
 *
 * Usage:
 *  import { mountAvatarBadge, updateAvatarBadge } from "/scripts/components/avatarBadge.js";
 *  const api = await mountAvatarBadge(document.querySelector("#hudUser"));
 *  api.update({ displayName, avatarId, emoji, xp, streak });
 *
 *  // or one-liner:
 *  await mountAvatarBadge("#hudUser", { size: 56, uid: auth.currentUser?.uid });
 */

import { auth, db, doc, getDoc, onSnapshot } from "/scripts/firebase-bridge.js";

// ---- CSS (auto-injected once) ----------------------------------------------
const CSS_ID = "whylee-avatarbadge-css";
const CSS = `
.wy-badge{--sz:56px;--ring:#2F7CFF;--muted:var(--text-muted,#8ca0c8);--panel:var(--bg-surface,#0b1220);--gold:#F5D36B;}
.wy-badge{display:inline-grid;grid-template-columns:auto 1fr;gap:.6rem;align-items:center}
.wy-badge__ph{position:relative;width:var(--sz);height:var(--sz)}
.wy-badge__ring{position:absolute;inset:0}
.wy-badge__ava{position:absolute;inset:4px;border-radius:12px;overflow:hidden;background:#0a0e17}
.wy-badge__ava img{width:100%;height:100%;object-fit:cover;display:block;border-radius:12px}
.wy-badge__emoji{position:absolute;bottom:-4px;right:-4px;background:var(--panel);border:1px solid rgba(255,255,255,.08);
  border-radius:10px;padding:2px 6px;font-size:.9rem;box-shadow:0 2px 8px rgba(0,0,0,.35)}
.wy-badge__meta{min-width:140px}
.wy-badge__name{font-weight:700;line-height:1}
.wy-badge__sub{font-size:.85rem;color:var(--muted);display:flex;gap:.5rem;align-items:center;line-height:1.2;margin-top:.15rem}
.wy-chip{display:inline-flex;gap:.35rem;align-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);
  border-radius:999px;padding:.15rem .5rem}
.wy-chip--streak{border-color:rgba(255,180,0,.25);background:linear-gradient(180deg,rgba(245,211,107,.12),rgba(245,211,107,.03))}
.wy-chip svg{width:14px;height:14px}
@media (prefers-reduced-motion:no-preference){
  .wy-badge__ring circle[data-prog]{transition:stroke-dashoffset .5s ease}
}
`;

// ---- Helpers ----------------------------------------------------------------
function ensureCss() {
  if (document.getElementById(CSS_ID)) return;
  const tag = document.createElement("style");
  tag.id = CSS_ID;
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

function xpToLevel(xp = 0) {
  // Simple curve: L = floor(0.1 * sqrt(xp)) + 1; next requires (10L)^2 total
  const level = Math.max(1, Math.floor(0.1 * Math.sqrt(Math.max(0, xp))) + 1);
  const totalForLvl = Math.pow(10 * level, 2);
  const totalPrev = Math.pow(10 * (level - 1), 2);
  const prog = Math.max(0, xp - totalPrev) / Math.max(1, totalForLvl - totalPrev);
  return { level, progress: Math.min(1, prog) };
}

function avatarPath(avatarId = "fox-default") {
  // Accepts bare ids with or without "-pro"
  if (avatarId.endsWith(".png")) return avatarId;
  return `/media/avatars/${avatarId}.png`;
}

function ringTemplate(size, progress) {
  const s = size; const r = (s/2) - 2; const cx = s/2; const cy = s/2;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, c - c * progress);
  return `
    <svg class="wy-badge__ring" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="3"/>
      <circle data-prog cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--ring)" stroke-linecap="round" stroke-width="3"
              stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${dash.toFixed(2)}" />
    </svg>
  `;
}

function htm(strings, ...vals){return strings.map((s,i)=>s+(vals[i]??"")).join("");}

// ---- Public API --------------------------------------------------------------
export async function mountAvatarBadge(target, opts = {}) {
  ensureCss();
  const el = (typeof target === "string") ? document.querySelector(target) : target;
  if (!el) throw new Error("mountAvatarBadge: target not found");

  const size = Math.max(40, Math.min(96, opts.size ?? 56));
  const container = document.createElement("div");
  container.className = "wy-badge";
  container.innerHTML = template({ size, displayName: "Player", avatarId: "fox-default", emoji: "🦊", xp: 0, streak: 0 });
  el.innerHTML = "";
  el.appendChild(container);

  const api = {
    el: container,
    update: (data) => render(container, { ...data, size }),
    destroy: () => { container.remove(); unsub && unsub(); }
  };

  // Live bind to user if uid present
  let unsub = null;
  const uid = opts.uid ?? auth.currentUser?.uid ?? null;
  if (uid) {
    const ref = doc(db, "users", uid);
    unsub = onSnapshot(ref, (snap) => {
      const d = snap.data() || {};
      api.update({
        displayName: d.displayName || "Player",
        avatarId: d.avatarId || "fox-default",
        emoji: d.emoji || "🦊",
        xp: d.xp || 0,
        streak: d.streak || 0
      });
    });
  } else if (opts.data) {
    api.update(opts.data);
  }

  return api;
}

export function updateAvatarBadge(instance, data) {
  // For imperative updates if you’re not using the returned api
  render(instance.el || instance, data);
}

// ---- Internal render ---------------------------------------------------------
function template({ size, displayName, avatarId, emoji, xp, streak }) {
  const { level, progress } = xpToLevel(xp);
  return htm`
    <div class="wy-badge__ph" style="--sz:${size}px">
      ${ringTemplate(size, progress)}
      <div class="wy-badge__ava"><img src="${avatarPath(avatarId)}" alt=""></div>
      <div class="wy-badge__emoji" aria-hidden="true">${emoji || "✨"}</div>
    </div>
    <div class="wy-badge__meta">
      <div class="wy-badge__name" title="${displayName || ""}">${displayName || "Player"}</div>
      <div class="wy-badge__sub">
        <span title="Level">Lvl ${level}</span>
        <span class="wy-chip wy-chip--streak" title="Daily streak">
          ${fireIcon()} ${Math.max(0, streak || 0)}
        </span>
      </div>
    </div>
  `;
}

function fireIcon(){
  return `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.6 1.8c.4 2.1-.5 3.5-1.5 4.8-1 1.2-1.8 2.3-1.1 4.1-1.5-.4-2.8-1.6-3.2-3.5C5.1 9.4 5 12.5 7 14.8c2.1 2.5 6.5 2.7 8.8-.2 1.9-2.4 1.2-5.3-.4-7.5-.5 1.9-2 3.3-3.7 3.8 1.2-2.5-.8-4.3 1.9-7.1Z"/></svg>`;
}

function render(container, data){
  // diff-lite: only update dynamic bits to avoid DOM churn
  const { size = 56, displayName, avatarId, emoji, xp, streak } = data;
  // ring
  const { progress } = xpToLevel(xp);
  const ring = container.querySelector("circle[data-prog]");
  if (ring){
    const r = parseFloat(ring.getAttribute("r"));
    const c = 2 * Math.PI * r;
    ring.style.strokeDasharray = c.toFixed(2);
    ring.style.strokeDashoffset = (c - c * progress).toFixed(2);
  }
  // avatar
  const img = container.querySelector(".wy-badge__ava img");
  if (img && avatarId) img.src = avatarPath(avatarId);
  // emoji
  const em = container.querySelector(".wy-badge__emoji");
  if (em && emoji) em.textContent = emoji;
  // name
  const nm = container.querySelector(".wy-badge__name");
  if (nm && displayName) { nm.textContent = displayName; nm.title = displayName; }
  // size CSS var
  container.querySelector(".wy-badge__ph").style.setProperty("--sz", `${Math.max(40,Math.min(96,size))}px`);
}
