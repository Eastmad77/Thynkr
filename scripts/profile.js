/**
 * /scripts/profile.js
 * Handles avatar selection and profile state
 */

import { auth } from "/scripts/firebase-bridge.js";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "/scripts/firebase-bridge.js";

const grid = document.querySelector("#avatar-grid");
const status = document.querySelector("#avatar-status");

async function loadAvatars() {
  const res = await fetch("/media/avatars/avatars.json");
  const json = await res.json();
  return json.avatars;
}

function renderAvatars(avatars, userData) {
  grid.innerHTML = "";
  avatars.forEach(a => {
    const el = document.createElement("div");
    el.className = `avatar ${a.pro ? "pro" : ""}`;
    el.innerHTML = `
      <img src="${a.src}" alt="${a.label}" title="${a.label}">
      ${a.pro ? '<div class="pro-badge">PRO</div>' : ""}
    `;
    if (a.id === userData?.avatarId) el.classList.add("active");
    if (a.pro && !userData?.proStatus) {
      el.classList.add("locked");
      el.addEventListener("click", () => alert("Available with Whylee Pro"));
    } else {
      el.addEventListener("click", () => selectAvatar(a.id));
    }
    grid.appendChild(el);
  });
}

async function selectAvatar(avatarId) {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, "users", user.uid);
  await updateDoc(ref, { avatarId });
  status.textContent = `✅ Avatar updated to ${avatarId}`;
  document.querySelectorAll(".avatar").forEach(a => a.classList.remove("active"));
  document.querySelector(`img[alt='${avatarId}']`)?.parentElement?.classList.add("active");
}

async function initProfile() {
  const avatars = await loadAvatars();
  const user = auth.currentUser;
  if (!user) {
    status.textContent = "Please sign in to edit profile.";
    return;
  }
  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.data();
  renderAvatars(avatars, data);
}

document.addEventListener("DOMContentLoaded", initProfile);
