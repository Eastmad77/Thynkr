/**
 * Whylee Cloud Sync (v8)
 * Path: /scripts/auth/cloudsync.js
 *
 * Responsibilities
 *  - Ensure users/{uid} exists with sane defaults
 *  - Write gameplay sessions to users/{uid}/sessions
 *  - Safe merges with transactions + server timestamps
 *  - Offline queue with retry on reconnect/auth state changes
 *  - Small helper APIs for badges, avatar, settings, pro flag
 */

import { auth, db } from "./firebase-bridge.js";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, addDoc, runTransaction, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.1/firebase-firestore.js";

const DEFAULT_PROFILE = (email = "", displayName = "", photoURL = "") => ({
  email, displayName, photoURL,
  xp: 0,
  level: 1,
  streak: 0,
  badges: [],
  proStatus: false,
  theme: "system",          // "system" | "light" | "dark" | "midnight" (from /scripts/theme/theme.js)
  avatar: "fox-default",    // id from /media/avatars/avatars.json
  createdAt: serverTimestamp(),
  lastUpdate: serverTimestamp()
});

let _unsubscribeUser = null;
let _offlineQueue = []; // [{fn, args}]
let _ready = false;

/* -------------------------------------------------- */
/* Boot + lifecycle                                    */
/* -------------------------------------------------- */
export function initCloudSync() {
  // Re-run flush when auth changes (login, logout)
  auth.onAuthStateChanged(async (user) => {
    if (_unsubscribeUser) { _unsubscribeUser(); _unsubscribeUser = null; }
    if (!user) { _ready = false; return; }

    // Ensure user doc exists
    await ensureUserDoc(user);

    // Live listener for user doc (theme/pro etc.)
    const userRef = doc(db, "users", user.uid);
    _unsubscribeUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        window.dispatchEvent(new CustomEvent("whylee:user", { detail: { uid: user.uid, data }}));
      }
    });

    _ready = true;
    flushQueue();
  });

  // Retry queued work on connectivity changes
  window.addEventListener("online", flushQueue);
}

/* -------------------------------------------------- */
/* Internals                                           */
/* -------------------------------------------------- */
async function ensureUserDoc(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, DEFAULT_PROFILE(user.email || "", user.displayName || "", user.photoURL || ""));
  } else {
    // Soft backfill any new keys
    const data = snap.data();
    const patch = {};
    ["xp","level","streak","badges","proStatus","theme","avatar"].forEach(k => {
      if (data[k] === undefined) patch[k] = DEFAULT_PROFILE()[k];
    });
    if (Object.keys(patch).length) {
      patch.lastUpdate = serverTimestamp();
      await updateDoc(userRef, patch);
    }
  }
}

function queue(fn, ...args) {
  _offlineQueue.push({ fn, args });
}

async function flushQueue() {
  if (!_ready || !navigator.onLine) return;
  const q = [..._offlineQueue];
  _offlineQueue = [];
  for (const job of q) {
    try { await job.fn(...job.args); }
    catch (e) { console.warn("CloudSync retry later:", e.message); _offlineQueue.push(job); }
  }
}

/* -------------------------------------------------- */
/* Public API                                          */
/* -------------------------------------------------- */
export async function getUserDoc(uid = auth.currentUser?.uid) {
  if (!uid) throw new Error("No user");
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserDoc(patch, uid = auth.currentUser?.uid) {
  if (!uid) throw new Error("No user");
  const exec = async () => updateDoc(doc(db, "users", uid), { ...patch, lastUpdate: serverTimestamp() });
  if (!_ready || !navigator.onLine) { queue(exec); return; }
  return exec();
}

export async function addSessionResult({ correct, total, durationMs, mode = "daily", xpEarned }) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user");

  const exec = async () => {
    const userRef = doc(db, "users", uid);
    const sessRef = collection(userRef, "sessions");

    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      const base = userSnap.exists() ? userSnap.data() : { xp: 0, level: 1, streak: 0 };
      const earned = typeof xpEarned === "number"
        ? xpEarned
        : Math.max(0, Math.round(correct * 20 - (durationMs / 1000 / Math.max(total,1)) * 2));
      const newXp = (base.xp || 0) + earned;
      const newLevel = Math.max(1, Math.floor(newXp / 1000) + 1);

      tx.set(doc(sessRef), {
        createdAt: serverTimestamp(),
        mode, correct, total, durationMs, xpEarned: earned
      });

      tx.update(userRef, {
        xp: newXp,
        level: newLevel,
        lastUpdate: serverTimestamp()
      });
    });
  };

  if (!_ready || !navigator.onLine) { queue(exec); return; }
  return exec();
}

export async function claimBadge(badgeId) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No user");
  const exec = async () => runTransaction(db, async (tx) => {
    const ref = doc(db, "users", uid);
    const snap = await tx.get(ref);
    const badges = new Set(snap.exists() ? (snap.data().badges || []) : []);
    if (!badges.has(badgeId)) {
      badges.add(badgeId);
      tx.update(ref, { badges: Array.from(badges), lastUpdate: serverTimestamp() });
    }
  });
  if (!_ready || !navigator.onLine) { queue(exec); return; }
  return exec();
}

export async function setAvatar(avatarId) {
  return updateUserDoc({ avatar: avatarId });
}

export async function setThemePref(theme) {
  return updateUserDoc({ theme }); // "system" | "light" | "dark" | "midnight"
}

export async function setProEnabled(enabled = true) {
  return updateUserDoc({ proStatus: !!enabled });
}

/**
 * Optional live subscription to the user doc.
 * Returns unsubscribe function.
 */
export function onUserSnapshot(cb, uid = auth.currentUser?.uid) {
  if (!uid) throw new Error("No user");
  const ref = doc(db, "users", uid);
  return onSnapshot(ref, s => { if (s.exists()) cb(s.data()); });
}
