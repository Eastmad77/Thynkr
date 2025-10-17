/**
 * Whylee Cloud Sync Module v8
 * Handles user progress storage, retrieval, and sync between
 * localStorage and Firebase Firestore.
 *
 * Integrates with:
 *  - auth.js  (for user identity)
 *  - entitlements.js (for Pro state)
 *  - profile.js (for avatar, name)
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "firebase/firestore";

import { firebaseConfig } from "../firebase-config.js";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ---------------------------
// INITIALISE
// ---------------------------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

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
 * Syncs user data from Firestore to localStorage.
 * Called on login or refresh.
 */
export async function fetchUserData(uid) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const remoteData = snap.data();
      const merged = mergeData(getLocalCache(), remoteData);
      saveLocalCache(merged);
      console.log("[CloudSync] Remote data synced:", merged);
      return merged;
    } else {
      console.log("[CloudSync] No remote data found. Creating baseline.");
      await initUserData(uid);
      return {};
    }
  } catch (error) {
    console.error("[CloudSync] Fetch error:", error);
    return getLocalCache();
  }
}

/**
 * Pushes local progress to Firestore.
 * Triggered on XP gain, avatar change, or logout.
 */
export async function pushUserData(uid, data) {
  try {
    const ref = doc(db, "users", uid);
    const payload = { ...getLocalCache(), ...data, lastSync: serverTimestamp() };
    await setDoc(ref, payload, { merge: true });
    saveLocalCache(payload);
    console.log("[CloudSync] Data pushed successfully.");
  } catch (error) {
    console.error("[CloudSync] Push error:", error);
  }
}

/**
 * Updates partial user data (non-destructive).
 * e.g., XP increment or new badge.
 */
export async function updateUserProgress(uid, updates) {
  try {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { ...updates, lastUpdate: serverTimestamp() });
    const cache = getLocalCache();
    saveLocalCache({ ...cache, ...updates });
    console.log("[CloudSync] Progress updated:", updates);
  } catch (error) {
    console.error("[CloudSync] Update error:", error);
  }
}

/**
 * Creates new baseline record on first login.
 */
export async function initUserData(uid) {
  const baseData = {
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
    await setDoc(doc(db, "users", uid), baseData);
    saveLocalCache(baseData);
    console.log("[CloudSync] User baseline created.");
  } catch (error) {
    console.error("[CloudSync] Init error:", error);
  }
}

/**
 * Clears local cache on sign-out.
 */
export function clearLocalData() {
  localStorage.removeItem(LOCAL_KEY);
  console.log("[CloudSync] Local cache cleared.");
}

// ---------------------------
// AUTO BINDING
// ---------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("[CloudSync] Logged in as", user.email);
    await fetchUserData(user.uid);
  } else {
    console.log("[CloudSync] No user logged in — local only mode.");
  }
});
