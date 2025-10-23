// /scripts/firebase-bridge.js  (v9007)
// Lightweight bridge that loads Firebase from the official CDN (ESM) and exports what the app uses.
// IMPORTANT: /scripts/firebase-config.js must be loaded first (in HTML) so window.firebaseConfig exists.

const cfg = (typeof window !== "undefined" && window.firebaseConfig) || null;
if (!cfg) {
  throw new Error("[firebase-bridge] Missing global firebaseConfig. Make sure /scripts/firebase-config.js is loaded before this file.");
}

// Pin a Firebase version you’ve tested
const FB_VER = "11.0.1";
const BASE = `https://www.gstatic.com/firebasejs/${FB_VER}`;

// Lazy-load Firebase ESM modules from the CDN
const [
  { initializeApp },
  { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut },
  { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, orderBy, limit, onSnapshot, serverTimestamp, arrayUnion },
  { getStorage, ref, getDownloadURL }
] = await Promise.all([
  import(`${BASE}/firebase-app.js`),
  import(`${BASE}/firebase-auth.js`),
  import(`${BASE}/firebase-firestore.js`),
  import(`${BASE}/firebase-storage.js`)
]);

// Init
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Re-export what the rest of the site uses.
// (This keeps your page scripts clean and avoids importing the CDN directly.)
export {
  app,
  auth,
  db,
  storage,
  // auth
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  // firestore
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, limit,
  onSnapshot, serverTimestamp, arrayUnion,
  // storage
  ref, getDownloadURL
};

// Optional: make minimal globals for legacy code that expects window.FirebaseBridge
if (typeof window !== "undefined") {
  window.FirebaseBridge = { app, auth, db, storage };
}
