// Firebase Cloud Messaging SW (compat build) — Thynkr
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Use your real config:
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.web.app",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "G-XXXXXXX"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Thynkr';
  const body  = payload.notification?.body  || 'Today’s set is ready — keep your streak alive!';
  self.registration.showNotification(title, {
    body,
    icon: '/media/thynkr-icon-192.png',
    badge: '/media/thynkr-icon-192.png',
    data: { url: (payload.fcmOptions?.link || 'https://your-domain.example/') }
  });
});

// Focus app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
