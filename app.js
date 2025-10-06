/* =======================================================
   Thynkr — Premium App Logic (v7.1 Silent + FCM Opt-in)
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // ---------- Cache DOM ----------
  const startBtn      = document.getElementById("startBtn");
  const shuffleBtn    = document.getElementById("shuffleBtn");
  const shareBtn      = document.getElementById("shareBtn");
  const playAgainBtn  = document.getElementById("playAgainBtn");

  const startSplash   = document.getElementById("startSplash");
  const successSplash = document.getElementById("successSplash");
  const startVideo    = document.getElementById("startVideo");
  const successVideo  = document.getElementById("successVideo");

  const questionBox   = document.getElementById("questionBox");
  const choicesBox    = document.getElementById("choices");
  const gameOverBox   = document.getElementById("gameOverBox");
  const gameOverText  = document.getElementById("gameOverText");

  // ---------- Game state ----------
  let currentQuestion = 0;
  let score = 0;
  let isPlaying = false;

  // =======================================================
  // START SEQUENCE — Play Intro Video then Countdown
  // =======================================================
  if (startBtn) {
    startBtn.addEventListener("click", async () => {
      if (isPlaying) return;
      isPlaying = true;

      // Hide splash overlay gracefully
      if (startSplash) {
        startSplash.classList.add("fade-out");
        await fadeOut(startSplash, 600);
      }

      // Play intro video, then countdown
      if (startVideo) {
        startVideo.style.display = "block";
        try { await startVideo.play(); } catch { /* autoplay guard */ }

        startVideo.onended = () => {
          startVideo.style.display = "none";
          startCountdown(3); // 3-second countdown
        };
      } else {
        // No video available: go straight to countdown
        startCountdown(3);
      }
    });
  }

  // =======================================================
  // COUNTDOWN — Centered, subtle transparent ring + glow
  // =======================================================
  function startCountdown(seconds) {
    const countdown = document.createElement("div");
    countdown.id = "countdown";
    Object.assign(countdown.style, {
      position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: "2000",
      background: "rgba(8, 26, 45, 0.8)",
      backdropFilter: "blur(10px)"
    });

    const ring = document.createElement("div");
    Object.assign(ring.style, {
      width: "180px", height: "180px", borderRadius: "50%",
      border: "3px solid rgba(23, 241, 209, 0.3)",
      position: "absolute",
      boxShadow: "0 0 25px rgba(23, 241, 209, 0.2)"
    });

    const text = document.createElement("div");
    Object.assign(text.style, {
      position: "relative",
      fontSize: "4rem",
      fontWeight: "700",
      color: "#17f1d1",
      textShadow: "0 0 15px rgba(23, 241, 209, 0.5)",
      animation: "pulseCount 0.8s ease-in-out infinite alternate"
    });

    countdown.appendChild(ring);
    countdown.appendChild(text);
    document.body.appendChild(countdown);

    let counter = seconds;
    text.textContent = counter;

    const interval = setInterval(() => {
      counter--;
      if (counter > 0) {
        text.textContent = counter;
      } else if (counter === 0) {
        text.textContent = "Go!";
      } else {
        clearInterval(interval);
        countdown.remove();
        startGame();
      }
    }, 1000);
  }

  // Inject keyframes for countdown pulse
  const kf = document.createElement("style");
  kf.textContent = `
    @keyframes pulseCount {
      0%   { transform: scale(1);   opacity: 1; }
      100% { transform: scale(1.1); opacity: 0.9; }
    }
  `;
  document.head.appendChild(kf);

  // =======================================================
  // GAMEPLAY — stubbed questions; plug CSV later
  // =======================================================
  const sampleQuestions = [
    { q: "What is 5 + 7?", options: ["10", "12", "11", "14"], answer: "12" },
    { q: "Capital of France?", options: ["Paris", "Rome", "London", "Berlin"], answer: "Paris" },
    { q: "Closest planet to the sun?", options: ["Venus", "Mercury", "Earth", "Mars"], answer: "Mercury" }
  ];

  function startGame() {
    score = 0;
    currentQuestion = 0;
    if (questionBox) questionBox.textContent = "Loading question…";
    loadNextQuestion();
  }

  function loadNextQuestion() {
    if (currentQuestion >= sampleQuestions.length) {
      showSuccess();
      return;
    }
    const q = sampleQuestions[currentQuestion];
    if (questionBox) questionBox.textContent = q.q;
    if (choicesBox) {
      choicesBox.innerHTML = "";
      q.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "btn ghost";
        btn.textContent = opt;
        btn.onclick = () => checkAnswer(opt, q.answer);
        choicesBox.appendChild(btn);
      });
    }
  }

  function checkAnswer(selected, correct) {
    if (selected === correct) score++;
    currentQuestion++;
    loadNextQuestion();
  }

  // =======================================================
  // SUCCESS SPLASH — play celebration video
  // =======================================================
  function showSuccess() {
    if (successSplash) successSplash.style.display = "flex";
    if (successVideo) {
      successVideo.style.display = "block";
      try { successVideo.play(); } catch {}
      successVideo.onended = () => {
        if (successSplash) successSplash.style.display = "none";
        resetGame();
      };
    } else {
      // If no video, just reset after a short pause
      setTimeout(() => {
        if (successSplash) successSplash.style.display = "none";
        resetGame();
      }, 1500);
    }
  }

  function resetGame() {
    isPlaying = false;
    if (questionBox) questionBox.textContent = "Press Start to Play";
    if (choicesBox) choicesBox.innerHTML = "";
    if (gameOverBox) gameOverBox.style.display = "none";
  }

  // =======================================================
  // UTIL — Fade Out Helper
  // =======================================================
  function fadeOut(el, duration) {
    return new Promise((resolve) => {
      if (!el) return resolve();
      el.style.transition = `opacity ${duration}ms ease`;
      el.style.opacity = 0;
      setTimeout(() => {
        el.style.display = "none";
        resolve();
      }, duration);
    });
  }

  // =======================================================
  // (Optional) Shuffle + Share wiring (safe guards)
  // =======================================================
  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
      // Simple shuffle of our sampleQuestions order
      sampleQuestions.sort(() => Math.random() - 0.5);
      if (!isPlaying) {
        if (questionBox) questionBox.textContent = "Press Start to Play";
        if (choicesBox) choicesBox.innerHTML = "";
      } else {
        currentQuestion = 0;
        loadNextQuestion();
      }
    });
  }

  if (shareBtn && navigator.share) {
    shareBtn.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: document.title || "Thynkr",
          text: "Sharpen your mind — daily with Thynkr.",
          url: location.href
        });
      } catch (e) {
        // silent
      }
    });
  }
});

/* =======================================================
   Thynkr — FCM opt-in (client; user-initiated)
   Requires:
   - firebase-app-compat.js + firebase-messaging-compat.js + /firebase-config.js in index.html
   - /firebase-messaging-sw.js at site root
   ======================================================= */

// Lightweight toast (fallback if shell.js toast not available)
function thToast(msg) {
  const existing = document.getElementById('th-toast');
  if (existing) {
    existing.textContent = msg;
    existing.style.opacity = '1';
    clearTimeout(existing._t);
    existing._t = setTimeout(() => { existing.style.opacity = '0'; }, 2200);
    return;
  }
  const t = document.createElement('div');
  t.id = 'th-toast';
  Object.assign(t.style, {
    position: 'fixed', left: '50%', bottom: '22px', transform: 'translateX(-50%)',
    zIndex: '3000', background: 'rgba(0,0,0,.75)', color: '#fff',
    padding: '10px 14px', borderRadius: '10px',
    fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
    fontSize: '14px', boxShadow: '0 6px 16px rgba(0,0,0,.35)',
    opacity: '0', transition: 'opacity .25s ease'
  });
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; });
  t._t = setTimeout(() => { t.style.opacity = '0'; }, 2200);
}

// Guards
function hasFirebaseCompat() {
  return typeof window !== 'undefined' &&
         typeof window.firebase !== 'undefined' &&
         typeof window.FB_CONFIG !== 'undefined' &&
         window.firebase.messaging;
}

// Register the FCM SW (separate from main SW)
async function registerFcmSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    return reg;
  } catch (e) {
    console.warn('FCM SW register failed:', e);
    return null;
  }
}

// Public API to call from a button: <button id="notifyBtn">Enable Notifications</button>
async function enableThynkrNotifications() {
  try {
    if (!hasFirebaseCompat()) {
      thToast('Notifications unavailable (Firebase not loaded)');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      thToast('Notifications blocked');
      return;
    }

    const reg = await registerFcmSW();

    // Initialize Firebase app if not already
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(window.FB_CONFIG);
    }
    const messaging = firebase.messaging();

    // TODO: replace with your real public VAPID key from Firebase Console → Cloud Messaging → Web configuration
    const VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY_HERE';

    const token = await messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg || undefined
    });

    if (!token) {
      thToast('Could not get device token');
      return;
    }

    localStorage.setItem('thynkr:fcmToken', token);
    thToast('Notifications enabled');

    // Foreground handler (optional): show a toast when a message arrives
    messaging.onMessage((payload) => {
      const title = payload.notification?.title || 'Thynkr';
      const body  = payload.notification?.body  || '';
      thToast(`${title}: ${body}`);
    });

  } catch (err) {
    console.warn('Enable notifications failed:', err);
    thToast('Notification setup failed');
  }
}

// Wire up the optional menu/button if present
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('notifyBtn'); // Add this button in your side menu or page
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      enableThynkrNotifications();
    });
  }
});
