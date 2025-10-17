// profile.js
import {
  auth, db, doc, getDoc, updateDoc, serverTimestamp
} from "./firebase-bridge.js";
import { isPro } from "./entitlements.js";
import { AVATARS } from "./onboarding.js";

const avatarGrid = sel("#profileAvatarGrid");
const emojiGrid  = sel("#profileEmojiGrid");
const statusEl   = sel("#profileSaveStatus");
const saveBtn    = sel("#profileSaveBtn");

const EMOJIS = ["🦊","🐼","🦉","🐯","🐻","🐲","🐺","✨","⭐️","🔥","🎯","💡","🎮","🌈","⚡️"];

let state = { uid:null, pro:false, current:{ avatarId:"fox", emoji:"🦊" }, selected:{ avatarId:null, emoji:null } };

init().catch(console.error);

async function init() {
  const user = auth.currentUser;
  if (!user) return;
  state.uid = user.uid;
  state.pro = await isPro(user.uid);

  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    const u = snap.data();
    state.current.avatarId = u.avatarId || "fox";
    state.current.emoji    = u.emoji || "🦊";
  }
  state.selected = { ...state.current };

  renderAvatars();
  renderEmojis();

  saveBtn.addEventListener("click", save);
}

function renderAvatars() {
  avatarGrid.innerHTML = "";
  AVATARS.forEach(a => {
    const locked = (a.tier === "pro" && !state.pro);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "avatar-card";
    btn.innerHTML = `
      <img class="ava-img" src="${a.src}" alt="${a.name}">
      <div class="muted" style="margin-top:6px;text-align:center">${a.name}</div>
    `;
    if (locked) {
      const l = document.createElement("span");
      l.className = "lock";
      l.textContent = "🔒 Pro";
      btn.appendChild(l);
    }
    if (a.id === state.selected.avatarId) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      if (locked) { alert("That avatar requires Whylee Pro."); return; }
      state.selected.avatarId = a.id;
      Array.from(avatarGrid.children).forEach(c => c.classList.remove("selected"));
      btn.classList.add("selected");
    });
    avatarGrid.appendChild(btn);
  });
}

function renderEmojis() {
  emojiGrid.innerHTML = "";
  EMOJIS.forEach(e => {
    const div = document.createElement("div");
    div.className = "choice-emoji";
    div.textContent = e;
    if (e === state.selected.emoji) div.classList.add("selected");
    div.addEventListener("click", () => {
      state.selected.emoji = e;
      Array.from(emojiGrid.children).forEach(c => c.classList.remove("selected"));
      div.classList.add("selected");
    });
    emojiGrid.appendChild(div);
  });
}

async function save() {
  statusEl.textContent = "Saving…";
  await updateDoc(doc(db, "users", state.uid), {
    avatarId: state.selected.avatarId,
    emoji: state.selected.emoji,
    updatedAt: serverTimestamp()
  });
  statusEl.textContent = "Saved ✓";
  setTimeout(()=>statusEl.textContent="",1500);
}

// helpers
function sel(s){ return document.querySelector(s); }
