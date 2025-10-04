/* ==========================================================
   The Daily Brain Bolt — App Logic
   Version 3.3 (Pro-ready)
   ----------------------------------------------------------
   Handles splash screens, streak tracking, quiz logic, menu,
   and Stripe checkout integration.
========================================================== */

console.log("[BrainBolt] App loaded");

// ---------- Global State ----------
let currentQuestionIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let questions = [];
let streak = 0;
let totalQuestions = 12;
let answeredQuestions = 0;
let streakIndicators = [];

// ---------- DOM Elements ----------
const splashStart = document.getElementById("splashStart");
const splashSuccess = document.getElementById("splashSuccess");
const splashFail = document.getElementById("splashFail");
const streakDisplay = document.getElementById("streakDisplay");
const menuButton = document.getElementById("menuButton");
const sideMenu = document.getElementById("sideMenu");

// ---------- Init ----------
window.addEventListener("DOMContentLoaded", () => {
  console.log("App ready");
  initMenu();
  initSplash();
  initQuiz();
});

// ---------- Splash Logic ----------
function initSplash() {
  if (!splashStart) return;
  splashStart.classList.remove("hidden");
  setTimeout(() => splashStart.classList.add("hidden"), 2500);
}

function showSuccessSplash() {
  if (!splashSuccess) return;
  splashSuccess.classList.remove("hidden");
  setTimeout(() => splashSuccess.classList.add("hidden"), 3000);
  setTimeout(() => window.location.href = "/", 3200);
}

function showFailSplash() {
  if (!splashFail) return;
  splashFail.classList.remove("hidden");
  setTimeout(() => splashFail.classList.add("hidden"), 3000);
  setTimeout(() => window.location.href = "/", 3200);
}

// ---------- Menu Logic ----------
function initMenu() {
  if (!menuButton || !sideMenu) return;
  menuButton.addEventListener("click", () => {
    sideMenu.classList.toggle("open");
    setTimeout(() => sideMenu.classList.remove("open"), 5000);
  });
}

// ---------- Quiz Logic ----------
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
  updateStreakDisplay();
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

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function handleAnswer(isCorrect) {
  answeredQuestions++;
  if (isCorrect) {
    correctCount++;
    streak++;
    streakIndicators.push("green");
    if (incorrectCount > 0 && streak >= 3) {
      incorrectCount--;
      streak = 0;
    }
  } else {
    incorrectCount++;
    streakIndicators.push("red");
    streak = 0;
    if (incorrectCount >= 3) {
      showFailSplash();
      return;
    }
  }

  updateStreakDisplay();
  currentQuestionIndex++;
  showQuestion();
}

function updateStreakDisplay() {
  if (!streakDisplay) return;
  streakDisplay.innerHTML = "";

  for (let i = 0; i < totalQuestions; i++) {
    const bar = document.createElement("div");
    bar.className = "streak-bar";
    if (streakIndicators[i] === "green") bar.classList.add("correct");
    else if (streakIndicators[i] === "red") bar.classList.add("incorrect");
    streakDisplay.appendChild(bar);
  }
}

// ---------- Stripe Checkout Integration ----------
async function startCheckout(plan) {
  try {
    const res = await fetch("/.netlify/functions/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }) // "monthly" or "yearly"
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Checkout failed: ${text}`);
    }

    const data = await res.json();
    if (data && data.url) {
      window.location.href = data.url;
    } else {
      throw new Error("No checkout URL returned");
    }
  } catch (err) {
    console.error("Checkout error:", err);
    alert("Could not start checkout. Please try again later.");
  }
}
window.startCheckout = startCheckout;

// ---------- Daily Streak Tracker (Login-Ready Placeholder) ----------
function updateDailyStreak() {
  const lastPlayed = localStorage.getItem("lastPlayed");
  const today = new Date().toDateString();

  if (lastPlayed === today) return;
  const streakCount = parseInt(localStorage.getItem("dayStreak") || "0");

  const diff = lastPlayed ? (new Date(today) - new Date(lastPlayed)) / (1000 * 60 * 60 * 24) : 0;
  if (diff === 1) localStorage.setItem("dayStreak", streakCount + 1);
  else if (diff > 1) localStorage.setItem("dayStreak", 0);

  localStorage.setItem("lastPlayed", today);
}
