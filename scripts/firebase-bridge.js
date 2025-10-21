// /scripts/firebase-bridge.js
// ESM bridge for Firebase Web SDK with explicit exports used across the app.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Config is supplied by inline <script> or by environment injection build-side.
// Fallback to window.* if present.
const firebaseConfig = {
  apiKey:            window.FIREBASE_API_KEY,
  authDomain:        window.FIREBASE_AUTH_DOMAIN,
  projectId:         window.FIREBASE_PROJECT_ID,
  storageBucket:     window.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID,
  appId:             window.FIREBASE_APP_ID,
  measurementId:     window.FIREBASE_MEASUREMENT_ID
};

// Init
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Re-exports used throughout app
export {
  app,
  auth,
  db,
  // Auth
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  // Firestore
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs
};
