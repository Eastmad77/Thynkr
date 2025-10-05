/* ============================
   THYNKR — v3.0 Game Engine
   ============================ */

console.log("[Thynkr] v3.0 loaded");

// ----------------------------------------------------
// GLOBAL STATE
// ----------------------------------------------------
let allQuestions = [];
let currentQuestions = [];
let currentLevel = 1;
const totalLevels = 3;
const questionsPerLevel = 12;

const redemptionRules = {
  1: 3, // Level 1: 3 consecutive correct to redeem
  2: 4, // Level 2: 4 consecutive
  3: 5  // Level 3: 5 consecutive
};

let questionIndex = 0;
let correctStreak = 0;
let strikes = 0;
let score = 0;
let isProUser = false; // toggle later with Firestore plan

// ----------------------------------------------------
// ELEMENTS
// ----------------------------------------------------
const questionBox = document.getElementById("questionBox");
const choicesBox = document.getElementById("choices");
const setLabel = document.getElementById("setLabel");
const progressLabel = document.getElementById("progressLabel");
const adContainer = document.getElementById("adContainer");
const successSplash = document.getElementById("successSplash");
const startBtn = document.getElementById("startBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const shareBtn = document.getElementById("shareBtn");

// ----------------------------------------------------
// INITIALISE GAME
// ----------------------------------------------------
if (startBtn) startBtn.addEventListener("click", startGame);

async function loadQuestions() {
  return new Promise((resolve, reject) => {
    Papa.parse("/questions.csv", {
      download: true,
      header: true,
      complete: (results) => {
        allQuestions = results.data.filter(q => q.Question);
        resolve();
      },
      error: reject,
    });
  });
}

// ----------------------------------------------------
// START + LEVEL MANAGEMENT
// ----------------------------------------------------
async function startGame() {
  console.log("[Thynkr] Starting game...");
  currentLevel = 1;
  score = 0;
  strikes = 0;
  correctStreak = 0;

  await loadQuestions();
  startCountdown(() => loadLevel(currentLevel));
}

function loadLevel(level) {
  const start = (level - 1) * questionsPerLevel;
  const end = level * questionsPerLevel;
  currentQuestions = allQuestions.slice(start, end);

  questionIndex = 0;
  strikes = 0;
  correctStreak = 0;

  updateLevelUI(level);
  showQuestion();
}

// ----------------------------------------------------
// COUNTDOWN
// ----------------------------------------------------
function startCountdown(callback) {
  const splash = document.getElementById("startSplash");
  const inner = splash.querySelector(".splash-inner");
  inner.innerHTML = `<div class="countdown-circle"><span id="countNum">3</span></div>`;
  splash.classList.add("visible");

  let count = 3;
  const counter = setInterval(() => {
    count--;
    const el = document.getElementById("countNum");
    if (el) el.textContent = count > 0 ? count : "Go!";
    if (count <= 0) {
      clearInterval(counter);
      setTimeout(() => {
        splash.classList.remove("visible");
        callback();
      }, 900);
    }
  }, 1000);
}

// ----------------------------------------------------
// SHOW QUESTION
// ----------------------------------------------------
function showQuestion() {
  const q = currentQuestions[questionIndex];
  if (!q) return endLevel();

  setLabel.textContent = `Level ${currentLevel} of ${totalLevels}`;
  progressLabel.textContent = `Q ${questionIndex + 1}/${questionsPerLevel}`;
  questionBox.textContent = q.Question;

  const answers = shuffleArray([q.OptionA, q.OptionB, q.OptionC, q.OptionD]);
  choicesBox.innerHTML = "";

  answers.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "btn choice";
    btn.textContent = opt;
    btn.onclick = () => handleAnswer(opt === q.Answer);
    choicesBox.appendChild(btn);
  });

  updateStreakBar();
}

// ----------------------------------------------------
// HANDLE ANSWERS
// ----------------------------------------------------
function handleAnswer(isCorrect) {
  if (isCorrect) {
    score++;
    correctStreak++;
    if (correctStreak >= redemptionRules[currentLevel] && strikes > 0) strikes--;
  } else {
    strikes++;
    correctStreak = 0;
  }

  questionIndex++;

  if (questionIndex >= currentQuestions.length) {
    endLevel();
  } else {
    showQuestion();
  }
}

// ----------------------------------------------------
// LEVEL END & TRANSITION
// ----------------------------------------------------
function endLevel() {
  showLevelSummary(currentLevel, score);

  if (currentLevel < totalLevels) {
    if (!isProUser) showAdIntermission(() => nextLevel());
    else nextLevel();
  } else {
    endGame();
  }
}

function nextLevel() {
  currentLevel++;
  if (currentLevel <= totalLevels) loadLevel(currentLevel);
  else endGame();
}

// ----------------------------------------------------
// LEVEL SUMMARY
// ----------------------------------------------------
function showLevelSummary(level, score) {
  questionBox.innerHTML = `
    <h2>Level ${level} Complete! 🧠</h2>
    <p>Your score so far: ${score} / ${(level) * questionsPerLevel}</p>
  `;
  choicesBox.innerHTML = "";

  const btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = (level < totalLevels) ? "Next Level →" : "View Results";
  btn.onclick = () => (level < totalLevels ? nextLevel() : endGame());
  questionBox.appendChild(btn);
}

// ----------------------------------------------------
// AD INTERMISSION (Free Only)
// ----------------------------------------------------
function showAdIntermission(callback) {
  adContainer.classList.remove("hidden");
  adContainer.innerHTML = `
    <div class="ad-card">
      <h2>Ad Break 🕒</h2>
      <p>Upgrade to <strong>Thynkr Pro</strong> for ad-free play!</p>
      <button class="btn ghost" id="skipAdBtn">Skip Ad (15s)</button>
    </div>
  `;

  let timer = 15;
  const skipBtn = document.getElementById("skipAdBtn");
  skipBtn.disabled = true;

  const countdown = setInterval(() => {
    timer--;
    skipBtn.textContent = `Skip Ad (${timer}s)`;
    if (timer <= 0) {
      clearInterval(countdown);
      adContainer.classList.add("hidden");
      callback();
    }
  }, 1000);
}

// ----------------------------------------------------
// GAME COMPLETE
// ----------------------------------------------------
function endGame() {
  showSuccessSplash();
  questionBox.innerHTML = `
    <h2>Thynkr Master Achieved ⚡</h2>
    <p>You scored ${score} / ${questionsPerLevel * totalLevels} correct!</p>
    <button class="btn primary" onclick="startGame()">Play Again</button>
  `;
  choicesBox.innerHTML = "";
}

// ----------------------------------------------------
// SUCCESS SPLASH
// ----------------------------------------------------
function showSuccessSplash() {
  successSplash.classList.add("visible");
  setTimeout(() => successSplash.classList.remove("visible"), 3000);
}

// ----------------------------------------------------
// UI HELPERS
// ----------------------------------------------------
function updateLevelUI(level) {
  document.body.className = `level-${level}`;
}

function updateStreakBar() {
  const bar = document.getElementById("streakVis");
  if (!bar) return;
  const streakGoal = redemptionRules[currentLevel];
  const fill = Math.min(correctStreak / streakGoal, 1) * 100;
  bar.style.width = `${fill}%`;
}

function shuffleArray(arr) {
  return arr.sort(() => Math.random() - 0.5);
}
