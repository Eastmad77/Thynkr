// /scripts/firebase-config.js
// Public Firebase Web SDK config for Whylee / DailyBrainBolt
// Must be loaded BEFORE /scripts/firebase-bridge.js on every page that uses Firebase.

export const firebaseConfig = {
  apiKey: "AIzaSyDfjcMzAl-Tll0xsHri91VHiMdTGmd7b2k",
  authDomain: "dailybrainbolt.firebaseapp.com",
  projectId: "dailybrainbolt",
  storageBucket: "dailybrainbolt.firebasestorage.app",
  messagingSenderId: "118224143962",
  appId: "1:118224143962:web:43d85714b96ac1357e7a63",
  measurementId: "G-M0P3TSCF8P"
};

// ALSO expose globally so non-bundled pages and bridge can see it.
try { window.firebaseConfig = firebaseConfig; } catch (e) {}
