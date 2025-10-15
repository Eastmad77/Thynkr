// firebase-messaging-sw.js — v7000
importScripts("https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "dailybrainbolt.firebaseapp.com",
  projectId: "dailybrainbolt",
  storageBucket: "dailybrainbolt.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

// Background push display
messaging.onBackgroundMessage(payload => {
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title || "Whylee", {
    body: body || "New daily challenge ready!",
    icon: icon || "/media/icons/whylee-icon-192.png"
  });
});
