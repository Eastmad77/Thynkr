// /scripts/firebase-bridge.js
// Whylee Firebase Bridge (v9006)
// - Assumes /scripts/firebase-config.js is loaded first (defines `firebaseConfig`)
// - Exposes typed, named exports for Auth, Firestore, Storage, and common helpers
// - Guards against double initialization across pages/modules

// Core SDKs
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

// Auth
import {
  getAuth,
  // If you want persistent sessions across tabs/devices, you can add persistence here
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firestore
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs,
  query, where, orderBy, limit,
  serverTimestamp, arrayUnion,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Storage (optional, exported for avatars/screenshots if needed)
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// ---------------------------------------------------------------------------
// App initialization (guarded)
// ---------------------------------------------------------------------------

if (typeof firebaseConfig === "undefined") {
  throw new Error("[firebase-bridge] Missing global firebaseConfig. Make sure /scripts/firebase-config.js is loaded before this file.");
}

let app;
if (getApps().length) {
  app = getApp();
} else {
  app = initializeApp(firebaseConfig);
}

// Instances
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

// ---------------------------------------------------------------------------
// Re-exports (everything pages/components need, in one place)
// ---------------------------------------------------------------------------

// Core instances
export { app, auth, db, storage };

// Auth utils
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
};

// Firestore primary helpers
export {
  doc, getDoc, setDoc, updateDoc,
  collection, addDoc, getDocs,
  query, where, orderBy, limit,
  serverTimestamp, arrayUnion,
  onSnapshot,
};

// Storage helpers (optional, used by profile uploads or screenshots)
export {
  storageRef,
  uploadBytes,
  getDownloadURL
};

// ---------------------------------------------------------------------------
// Convenience helpers (optional but handy)
// ---------------------------------------------------------------------------

/**
 * getUserDocRef
 * Returns the doc ref for users/{uid}
 */
export function getUserDocRef(uid) {
  if (!uid) throw new Error("[firebase-bridge] getUserDocRef: uid required");
  return doc(db, "users", uid);
}

/**
 * ensureUserDoc
 * Creates a minimal user doc if it doesn't exist (idempotent).
 */
export async function ensureUserDoc(uid, data = {}) {
  const ref = getUserDocRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const base = {
      createdAt: serverTimestamp(),
      xp: 0,
      streak: 0,
      pro: false,
      ...data
    };
    await setDoc(ref, base);
    return base;
  }
  return snap.data();
}

/**
 * requireAuth
 * Guard that throws if no current user is present.
 */
export function requireAuth() {
  const u = auth.currentUser;
  if (!u) throw new Error("[firebase-bridge] Not signed in");
  return u;
}
