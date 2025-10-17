// /scripts/firebase-bridge.js
// Unified Firebase bridge for Whylee App (v8)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 🔥 Replace this with your Firebase project config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "YOUR_APP_ID"
};

// --- Initialise -------------------------------------------------------------
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Helpers ----------------------------------------------------------------

// Creates a new user document if not present
export async function ensureUserDoc(user) {
  if (!user) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || "New Player",
      email: user.email || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      xp: 0,
      streak: 0,
      lastPlayed: null,
      avatarId: "fox",
      emoji: "🦊",
      pro: false,
      unlockedSkins: [],
      badges: [],
      settings: { theme: "dark", notifications: true }
    });
  }
}

// Update user data safely
export async function updateUserData(uid, data) {
  if (!uid) return;
  const ref = doc(db, "users", uid);
  await updateDoc(ref, { ...data, updatedAt: Date.now() });
}

// Simple sign-out
export async function signOutUser() {
  await signOut(auth);
}

// --- Auth listener ----------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user) await ensureUserDoc(user);
});

export { doc, getDoc, setDoc, updateDoc, collection, addDoc };
