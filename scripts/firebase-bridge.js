// /scripts/firebase-bridge.js
// Firebase ESM bridge (v11) — uses window.__FIREBASE (set by /scripts/firebase-config.js)

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  // core
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, getDocs,
  // queries
  query, where, orderBy, limit,
  // realtime
  onSnapshot,
  // fields/ops
  serverTimestamp, Timestamp, increment, arrayUnion, arrayRemove,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

function resolveConfig() {
  const cfg = (typeof window !== "undefined") ? window.__FIREBASE : null;
  if (!cfg || !cfg.apiKey || !cfg.projectId) {
    const msg = "[firebase-bridge] Missing window.__FIREBASE config (apiKey/projectId). Ensure /scripts/firebase-config.js loads first.";
    console.error(msg, { cfg });
    throw new Error(msg);
  }
  return cfg;
}

const app  = initializeApp(resolveConfig());
const auth = getAuth(app);
const db   = getFirestore(app);

export {
  app, auth, db,
  // Auth
  onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut,
  // Firestore core
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, addDoc, getDocs,
  // Queries & realtime
  query, where, orderBy, limit, onSnapshot,
  // Field ops
  serverTimestamp, Timestamp, increment, arrayUnion, arrayRemove,
};
