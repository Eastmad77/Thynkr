// Firebase Cloud Messaging SW (compat build for Thynkr)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_REAL_API_KEY",
  authDomain: "thynkr.firebaseapp.com",
  projectId: "thynkr",
  storageBucket: "thynkr.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Thynkr';
  const body  = payload.notification?.body  || 'Today’s challenge is ready — keep your streak alive!';
  self.registration.showNotification(title, {
    body,
    icon: '/media/thynkr-icon-192.png',
    badge: '/media/thynkr-icon-192.png',
    data: { url: 'https://thynkr.com/' } // replace with your actual domain or Netlify URL
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('https://thynkr.com/')); // same domain here
});
