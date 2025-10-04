/* ==========================================================
   The Daily Brain Bolt — App Logic
   v3.3 / cache v=5012
   ----------------------------------------------------------
   - Splash screens (auto-hide)
   - Slide-out menu (auto-hide after 5s)
   - Quiz logic (12 Qs)
   - Premium streak bar (floating glow, left=green, right=red)
   - 3 total incorrect ends game (non-consecutive)
   - 3 correct in a row removes 1 incorrect
   - Stripe Checkout integration (Pro)
========================================================== */

console.log("[BrainBolt] App loaded");

// ---------- Global State ----------
let currentQuestionIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let questions = [];
let streak = 0;                      // consecutive correct
let totalQuestions = 12;
let answeredQuestions = 0;
let streakIndicators = [];           // 'green' | 'red'

// ---------- DOM ----------
const splashStart   = document.getElementById("splashStart");
const splashSuccess = document.getElementById("splashSuccess");
const splashFail    = document.getElementById("splashFail");
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
    setTimeout(() => sideMenu.classList.remove("open"), 5000); // auto-hide
  });
}

// ---------- Quiz ----------
async function initQuiz() {
  const qEl = document.getElementById("questionText");
  if (!qEl) return; // not on the quiz page
  try {
    const res = await fetch("/questions.csv");
    const text = await res.text();
    questions = parseCSV(text);
    startQuiz();
  } catch (err) {
    console.error("Failed to load quiz:", err);
    qEl.textContent = "Could not load questions.";
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
  refreshStreakBar();     // show empty bar
  showQuestion();
}

function showQuestion() {
  if (currentQuestionIndex >= totalQuestions) {
    refreshStreakBar();
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

    // forgiveness: remove 1 incorrect after 3 correct in a row
    if (incorrectCount > 0 && streak >= 3) {
      incorrectCount--;
      streak = 0; // reset the forgiveness streak
    }
  } else {
    incorrectCount++;
    streak = 0;
    streakIndicators.push("red");

    if (incorrectCount >= 3) {
      refreshStreakBar(); // final state
      showFailSplash();
      return;
    }
  }

  refreshStreakBar();
  currentQuestionIndex++;
  showQuestion();
}

// ---------- Premium streak bar (glow) ----------
function refreshStreakBar() {
  const greenEl = document.getElementById('streakGreen');
  const redEl   = document.getElementById('streakRed');
  if (!greenEl || !redEl) return;

  const greens = streakIndicators.filter(x => x === 'green').length;
  const reds   = streakIndicators.filter(x => x === 'red').length;

  const greenPct = Math.max(0, Math.min(100, (greens / totalQuestions) * 100));
  const redPct   = Math.max(0, Math.min(100, (reds   / totalQuestions) * 100));

  greenEl.style.width = `${greenPct}%`; // grows from left
  redEl.style.width   = `${redPct}%`;   // grows from right (CSS handles right anchor)
}

// ---------- Stripe Checkout ----------
async function startCheckout(plan) {
  try {
    const res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })   // "monthly" or "yearly"
    });
    if (!res.ok) throw new Error(await res.text());
    const { url } = await res.json();
    if (url) window.location.href = url; else throw new Error('No URL returned');
  } catch (err) {
    console.error(err);
    const el = document.getElementById('proError');
    if (el) { el.classList.remove('hidden'); el.textContent = 'Checkout failed. Please try again.'; }
    else alert('Checkout failed. Please try again.');
  }
}
window.startCheckout = startCheckout;
