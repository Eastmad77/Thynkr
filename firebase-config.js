// firebase-config.js — v7000
// Used by Whylee for Auth, Firestore, Cloud Messaging

// Import the Firebase SDKs (served by CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging.js";

// ---- Replace with your real Firebase project values ----
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "dailybrainbolt.firebaseapp.com",
  projectId: "dailybrainbolt",
  storageBucket: "dailybrainbolt.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// ---------------------------------------------------------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

// Optional: foreground notification listener
onMessage(messaging, payload => {
  console.log("[Whylee] FCM message received in foreground:", payload);
});

export { app, db, messaging, getToken };
