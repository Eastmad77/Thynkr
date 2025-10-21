// /scripts/firebase-config.js
// Public Firebase Web SDK config for Whylee / DailyBrainBolt.
// IMPORTANT: we both export AND attach it to window so other modules can read it.

export const firebaseConfig = {
  apiKey: "AIzaSyDfjcMzAl-Tll0xsHri91VHiMdTGmd7b2k",
  authDomain: "dailybrainbolt.firebaseapp.com",
  projectId: "dailybrainbolt",
  storageBucket: "dailybrainbolt.firebasestorage.app",
  messagingSenderId: "118224143962",
  appId: "1:118224143962:web:43d85714b96ac1357e7a63",
  measurementId: "G-M0P3TSCF8P"
};

// Make it visible to any script that expects a global:
window.firebaseConfig = firebaseConfig;
