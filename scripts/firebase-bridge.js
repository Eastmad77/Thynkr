// /scripts/firebase-bridge.js
// ESM bridge that reads window.firebaseConfig and re-exports Firebase helpers.

if (!window.firebaseConfig) {
  throw new Error("[firebase-bridge] Missing global firebaseConfig. Make sure /scripts/firebase-config.js is loaded before this file.");
}

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot,
  serverTimestamp, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getStorage, ref, getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

const app = initializeApp(window.firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const storage = getStorage(app);

export {
  app, auth, db, storage,
  // auth
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  // firestore
  doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp, arrayUnion, arrayRemove,
  // storage
  ref, getDownloadURL
};
