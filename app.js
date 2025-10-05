/* Thynkr — Video splash edition (3 levels, redemption logic, ad interstitial) */

let allQuestions = [];
let currentQuestions = [];
let currentLevel = 1;
const totalLevels = 3;
const questionsPerLevel = 12;
const redemptionRules = { 1: 3, 2: 4, 3: 5 };

let questionIndex = 0;
let correctStreak = 0;
let strikes = 0;
let score = 0;
let isProUser = false; // wire to your entitlement when Stripe/Firestore is ready

// DOM
const questionBox   = document.getElementById("questionBox");
const choicesBox    = document.getElementById("choices");
const setLabel      = document.getElementById("setLabel");
const progressLabel = document.getElementById("progressLabel");
const pillScore     = document.getElementById("pillScore");
const adContainer   = document.getElementById("adContainer");

const startSplash = document.getElementById("startSplash");
const successSplash = document.getElementById("successSplash");
const startVid   = document.getElementById("startVid");
const successVid = document.getElementById("successVid");

const startBtn   = document.getElementById("startBtn");
const shuffleBtn = document.getElementById("shuffleBtn");

// Side menu
const mmMenuBtn = document.getElementById("mmMenuBtn");
const mmSideMenu = document.getElementById("mmSideMenu");
if (mmMenuBtn && mmSideMenu) {
  mmMenuBtn.addEventListener("click", () => mmSideMenu.classList.toggle("visible"));
}

// Controls
if (startBtn)   startBtn.addEventListener("click", startGame);
if (shuffleBtn) shuffleBtn.addEventListener("click", () => shuffleAndRestart());

// CSV loader (adjust path as needed)
async function loadQuestions() {
  return new Promise((resolve, reject) => {
    Papa.parse("/questions.csv", {
      download: true,
      header: true,
      complete: (res) => {
        allQuestions = res.data.filter(q => (q.Question && q.Answer));
        resolve();
      },
      error: reject
    });
  });
}

async function startGame() {
  currentLevel = 1;
  score = 0; strikes = 0; correctStreak = 0;
  await loadQuestions();
  showStartCountdown(() => loadLevel(currentLevel));
}

// Only shows after Start is pressed
function showStartCountdown(done) {
  // Reset content
  const countNum = document.getElementById("countNum");
  const countMsg = document.getElementById("countMsg");
  if (countNum) countNum.textContent = "3";
  if (countMsg) countMsg.textContent = "Starting in 3";

  startSplash.classList.add("visible");
  if (startVid) {
    try { startVid.currentTime = 0; startVid.play().catch(()=>{}); } catch(e){}
  }

  let c = 3;
  const iv = setInterval(() => {
    c--;
    if (countNum) countNum.textContent = (c > 0 ? c : "Go!");
    if (countMsg) countMsg.textContent = (c > 0 ? `Starting in ${c}` : "Go!");
    if (c <= 0) {
      clearInterval(iv);
      setTimeout(() => {
        if (startVid) { try { startVid.pause(); } catch(e){} }
        startSplash.classList.remove("visible");
        done();
      }, 850);
    }
  }, 1000);
}

function shuffleAndRestart() {
  // Simple reshuffle of entire dataset; could be per level if preferred
  allQuestions = shuffle(allQuestions);
  startGame();
}

// Level handling
function loadLevel(level) {
  const start = (level - 1) * questionsPerLevel;
  const end   = level * questionsPerLevel;
  currentQuestions = allQuestions.slice(start, end);

  questionIndex = 0;
  strikes = 0;
  correctStreak = 0;

  updateLevelUI(level);
  showQuestion();
}

function updateLevelUI(level) {
  document.body.className = `level-${level}`;
  setLabel.textContent = `Level ${level} of ${totalLevels}`;
  pillScore.textContent = `Score ${score}`;
  progressLabel.textContent = `Q 0/${questionsPerLevel}`;
}

function showQuestion() {
  const q = currentQuestions[questionIndex];
  if (!q) return endLevel();

  progressLabel.textContent = `Q ${questionIndex + 1}/${questionsPerLevel}`;
  questionBox.textContent = q.Question;

  const options = [
    q.OptionA, q.OptionB, q.OptionC, q.OptionD
  ].filter(Boolean);

  // Ensure the correct answer is present in the options; fallback if CSV is sparse
  if (!options.includes(q.Answer) && q.Answer) options.push(q.Answer);

  const answers = shuffle(options);
  choicesBox.innerHTML = "";
  answers.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "btn choice";
    btn.textContent = opt;
    btn.onclick = () => handleAnswer(opt === q.Answer);
    choicesBox.appendChild(btn);
  });

  updateStreakBar();
}

function handleAnswer(isCorrect) {
  if (isCorrect) {
    score++;
    correctStreak++;
    if (correctStreak >= redemptionRules[currentLevel] && strikes > 0) strikes--;
  } else {
    strikes++;
    correctStreak = 0;
  }

  pillScore.textContent = `Score ${score}`;
  questionIndex++;
  if (questionIndex >= currentQuestions.length) endLevel();
  else showQuestion();
}

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

function showLevelSummary(level, scoreNow) {
  questionBox.innerHTML = `
    <h2>Level ${level} Complete! 🧠</h2>
    <p>Your score so far: ${scoreNow} / ${(level) * questionsPerLevel}</p>
  `;
  choicesBox.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = (level < totalLevels) ? "Next Level →" : "View Results";
  btn.onclick = () => (level < totalLevels ? nextLevel() : endGame());
  questionBox.appendChild(btn);
}

function showAdIntermission(done) {
  adContainer.classList.remove("hidden");
  adContainer.innerHTML = `
    <div class="ad-card">
      <h2>Ad Break 🕒</h2>
      <p>Upgrade to <strong>Thynkr Pro</strong> for ad-free play!</p>
      <button class="btn ghost" id="skipAdBtn">Skip Ad (15s)</button>
    </div>
  `;
  let t = 15;
  const skipBtn = document.getElementById("skipAdBtn");
  skipBtn.disabled = true;
  const iv = setInterval(() => {
    t--;
    if (skipBtn) skipBtn.textContent = `Skip Ad (${t}s)`;
    if (t <= 0) {
      clearInterval(iv);
      adContainer.classList.add("hidden");
      done();
    }
  }, 1000);
}

function endGame() {
  showSuccessSplash();
  questionBox.innerHTML = `
    <h2>Thynkr Master Achieved ⚡</h2>
    <p>You scored ${score} / ${questionsPerLevel * totalLevels} correct!</p>
    <button class="btn primary" onclick="startGame()">Play Again</button>
  `;
  choicesBox.innerHTML = "";
}

function showSuccessSplash() {
  successSplash.classList.add("visible");
  if (successVid) {
    try {
      successVid.currentTime = 0;
      successVid.play().catch(()=>{});
      successVid.onended = () => {
        successSplash.classList.remove("visible");
        successVid.onended = null;
      };
    } catch(e) {
      setTimeout(()=>successSplash.classList.remove("visible"), 2400);
    }
  } else {
    setTimeout(()=>successSplash.classList.remove("visible"), 2400);
  }
}

function updateStreakBar() {
  const bar = document.getElementById("streakVis");
  if (!bar) return;
  const goal = redemptionRules[currentLevel];
  const fill = Math.min(correctStreak / goal, 1) * 100;
  bar.style.setProperty('--streak-progress', `${fill}%`);
}

function shuffle(arr){ return [...arr].sort(()=>Math.random()-0.5) }
