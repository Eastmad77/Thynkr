/**
 * Whylee Firebase Bridge v8
 * Central shared Firebase instance for all client modules.
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { firebaseConfig } from "../firebase-config.js";

// Initialize app
const app = initializeApp(firebaseConfig);

// Export shared services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

console.log("[Firebase Bridge] Initialized global Firebase services.");
