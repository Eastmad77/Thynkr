/**
 * Whylee CloudSync Module v8
 * Syncs user progress, XP, avatars, and badges between localStorage and Firestore.
 * Integrates with:
 *  - firebase-bridge.js (shared Firebase instance)
 *  - auth.js (user session)
 *  - entitlements.js (Pro status)
 *  - profile.js (avatar/theme)
 */

import { db, auth } from "./firebase-bridge.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// ---------------------------
// CONSTANTS
// ---------------------------
const LOCAL_KEY = "whyleeCloudCache_v8";

// ---------------------------
// HELPERS
// ---------------------------
function getLocalCache() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
  } catch {
    return {};
  }
}

function saveLocalCache(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

function mergeData(local, remote) {
  return { ...remote, ...local, updated: new Date().toISOString() };
}

// ---------------------------
// CORE FUNCTIONS
// ---------------------------

/**
 * Pull user data from Firestore → local cache
 */
export async function fetchUserData(uid) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const remote = snap.data();
      const merged = mergeData(getLocalCache(), remote);
      saveLocalCache(merged);
      console.log("[CloudSync] Synced from Firestore:", merged);
      return merged;
    } else {
      console.log("[CloudSync] No data found — creating new baseline.");
      await initUserData(uid);
      return {};
    }
  } catch (err) {
    console.error("[CloudSync] Fetch error:", err);
    return getLocalCache();
  }
}

/**
 * Push local data → Firestore (safe merge)
 */
export async function pushUserData(uid, data) {
  try {
    const ref = doc(db, "users", uid);
    const merged = { ...getLocalCache(), ...data, lastSync: serverTimestamp() };
    await setDoc(ref, merged, { merge: true });
    saveLocalCache(merged);
    console.log("[CloudSync] Data pushed successfully.");
  } catch (err) {
    console.error("[CloudSync] Push error:", err);
  }
}

/**
 * Partial updates for small changes (XP, avatar, etc.)
 */
export async function updateUserProgress(uid, updates) {
  try {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { ...updates, lastUpdate: serverTimestamp() });
    const cache = getLocalCache();
    saveLocalCache({ ...cache, ...updates });
    console.log("[CloudSync] Updated fields:", updates);
  } catch (err) {
    console.error("[CloudSync] Update error:", err);
  }
}

/**
 * Initialize a new user's baseline document
 */
export async function initUserData(uid) {
  const base = {
    xp: 0,
    level: 1,
    avatar: "fox-default",
    streak: 0,
    badges: [],
    proStatus: false,
    theme: "default",
    createdAt: serverTimestamp(),
    lastSync: serverTimestamp()
  };
  try {
    await setDoc(doc(db, "users", uid), base);
    saveLocalCache(base);
    console.log("[CloudSync] User baseline created.");
  } catch (err) {
    console.error("[CloudSync] Init error:", err);
  }
}

/**
 * Clear cached data on logout
 */
export function clearLocalData() {
  localStorage.removeItem(LOCAL_KEY);
  console.log("[CloudSync] Local cache cleared.");
}

// ---------------------------
// AUTO-SYNC BINDING
// ---------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("[CloudSync] Detected login:", user.email);
    await fetchUserData(user.uid);
  } else {
    console.log("[CloudSync] Signed out — local mode only.");
  }
});
