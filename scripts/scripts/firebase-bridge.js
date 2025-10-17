/**
 * Whylee Firebase Bridge v8
 * Centralizes Firebase initialization for all modules.
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// --- CONFIG IMPORT ---
import { firebaseConfig } from "../firebase-config.js";

// --- INIT FIREBASE APP ---
const app = initializeApp(firebaseConfig);

// --- EXPORT SERVICES ---
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

console.log("[Firebase Bridge] Firebase initialized and shared globally.");
