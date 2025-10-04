/* ==========================================================
   The Daily Brain Bolt — App Logic
   Version 3.3 (Pro-ready)
   ----------------------------------------------------------
   - Splash screens (auto-hide)
   - Slide-out menu (auto-hide after 5s)
   - Quiz logic (12 Qs)
   - Premium streak bar (floating glow segments)
   - 3 total incorrect ends game (non-consecutive)
   - 3 correct in a row removes 1 incorrect
   - Stripe Checkout integration for Pro
========================================================== */

console.log("[BrainBolt] App loaded");

// ---------- Global State ----------
let currentQuestionIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let questions = [];
let streak = 0;                      // consecutive-correct streak
let totalQuestions = 12;
let answeredQuestions = 0;
let streakIndicators = [];           // array of 'green' | 'red' per question answered

// ---------- DOM ----------
const splashStart   = document.getElementById("splashStart");
const splashSuccess = document.getElementById("splashSuccess");
const splashFail    = document.getElementById("splashFail");
const streakDisplay = document.getElementById("streakDisplay");
const menuButton    = document.getElementById("menuButton");
const sideMenu      = document.getElementById("sideMenu");

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", () => {
  initMenu();
  initSplash();
  initQuiz();
});

// ---------- Splash ----------
function initSplash() {
  if (!splashStart) return;
  splashStart.classList.remove("hidden");
  setTimeout(() => splashStart.classList.add("hidden"), 2500);
}
function showSuccessSplash() {
  if (!splashSuccess) return;
  splashSuccess.classList.remove("hidden");
  setTimeout(() => splashSuccess.classList.add("hidden"), 3000);
  setTimeout(() => (window.location.href = "/"), 3200);
}
function showFailSplash() {
  if (!splashFail) return;
  splashFail.classList.remove("hidden");
  setTimeout(() => splashFail.classList.add("hidden"), 3000);
  setTimeout(() => (window.location.href = "/"), 3200);
}

// ---------- Menu ----------
function initMenu() {
  if (!menuButton || !sideMenu) return;
  menuButton.addEventListener("click", () => {
    sideMenu.classList.toggle("open");
    // auto-hide after 5s
    setTimeout(() => sideMenu.classList.remove("open"), 5000);
  });
}

// ---------- Quiz ----------
async function initQuiz() {
  try {
    const res = await fetch("/questions.csv");
    const text = await res.text();
    questions = parseCSV(text);
    startQuiz();
  } catch (err) {
    console.error("Failed to load quiz:", err);
  }
}

function parseCSV(text) {
  const rows = text.split("\n").filter(r => r.trim() !== "");
  const headers = rows.shift().split("\t");
  return rows.map(row => {
    const values = row.split("\t");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i]));
    return obj;
  });
}

function startQuiz() {
  currentQuestionIndex = 0;
  correctCount = 0;
  incorrectCount = 0;
  streak = 0;
  answeredQuestions = 0;
  streakIndicators = [];
  renderStreakDisplay(); // draw 12 empty segments
  showQuestion();
}

function showQuestion() {
  if (currentQuestionIndex >= totalQuestions) {
    showSuccessSplash();
    return;
  }

  const q = questions[currentQuestionIndex];
  const qEl = document.getElementById("questionText");
  const opts = document.querySelectorAll(".option");
  if (!qEl || !opts.length) return;

  qEl.textContent = q.Question;

  const shuffled = shuffle([q.OptionA, q.OptionB, q.OptionC, q.OptionD]);
  opts.forEach((btn, i) => {
    btn.textContent = shuffled[i];
    btn.onclick = () => handleAnswer(btn.textContent === q.Answer);
  });
}

function shuffle(arr) { return arr.sort(() => Math.random() - 0.5); }

function handleAnswer(isCorrect) {
  answeredQuestions++;

  if (isCorrect) {
    correctCount++;
    streak++;
    streakIndicators.push("green");

    // remove 1 incorrect if 3 correct in a row
    if (incorrectCount > 0 && streak >= 3) {
      incorrectCount--;
      streak = 0; // reset the "healing" streak
    }
  } else {
    incorrectCount++;
    streak = 0;
    streakIndicators.push("red");

    // end after 3 total incorrect
    if (incorrectCount >= 3) {
      updateStreakDisplay(); // show final state
      showFailSplash();
      return;
    }
  }

  updateStreakDisplay();
  currentQuestionIndex++;
  showQuestion();
}

// ---------- Premium Streak Bar (glowing segments) ----------
function renderStreakDisplay() {
  if (!streakDisplay) return;
  streakDisplay.innerHTML = "";
  for (let i = 0; i < totalQuestions; i++) {
    const seg = document.createElement("div");
    seg.className = "streak-seg";
    // add inner light rail for subtle base
    const rail = document.createElement("div");
    rail.className = "streak-rail";
    seg.appendChild(rail);
    streakDisplay.appendChild(seg);
  }
  updateStreakDisplay();
}

function updateStreakDisplay() {
  if (!streakDisplay) return;
  const segs = Array.from(streakDisplay.children);

  // clear classes
  segs.forEach(s => {
    s.classList.remove("is-correct","is-incorrect");
  });

  // apply glow state per answered question
  for (let i = 0; i < streakIndicators.length; i++) {
    const seg = segs[i];
    if (!seg) continue;
    if (streakIndicators[i] === "green") seg.classList.add("is-correct");
    if (streakIndicators[i] === "red")   seg.classList.add("is-incorrect");
  }
}

// ---------- Stripe Checkout ----------
async function startCheckout(plan) {
  try {
    const res = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }) // "monthly" | "yearly"
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Checkout failed: ${text}`);
    }

    const data = await res.json(); // { url }
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      throw new Error("No checkout URL returned");
    }
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Could not start checkout. Please try again.");
  }
}
window.startCheckout = startCheckout;

// ---------- Daily Streak (placeholder local) ----------
function updateDailyStreak() {
  const lastPlayed = localStorage.getItem("lastPlayed");
  const today = new Date().toDateString();

  if (lastPlayed === today) return;
  const prev = parseInt(localStorage.getItem("dayStreak") || "0", 10);
  const diff = lastPlayed ? (new Date(today) - new Date(lastPlayed)) / 86400000 : 0;

  if (diff === 1) localStorage.setItem("dayStreak", prev + 1);
  else if (diff > 1) localStorage.setItem("dayStreak", 0);

  localStorage.setItem("lastPlayed", today);
}
