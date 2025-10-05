// ===== Brain ⚡ Bolt — App.js v3.12.3 (defensive CSV + premium redemption) =====
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS6725qpD0gRYajBJaOjxcSpTFxJtS2fBzrT1XAjp9t5SHnBJCrLFuHY4C51HFV0A4MK-4c6t7jTKGG/pub?gid=1410250735&single=true&output=csv";

const QUESTION_TIME_MS = 10000;
const QUESTION_TICK_MS = 100;

let questions = [], currentIndex = 0, score = 0;
let wrongTotal = 0;
let correctSinceLastWrong = 0;
let elapsed = 0;
let elapsedInterval = null;
let qTimer = null, qRemaining = QUESTION_TIME_MS, qLastTickSec = 3;
let soundOn = true;
let successAutoNav = null;

/* Elements */
const startBtn = document.getElementById("startBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const shareBtn = document.getElementById("shareBtn");
const playAgainBtn = document.getElementById("playAgainBtn");

const qBox = document.getElementById("questionBox");
const choicesDiv = document.getElementById("choices");
const pillScore = document.getElementById("pillScore");
const progressLabel = document.getElementById("progressLabel");
const elapsedTimeEl = document.getElementById("elapsedTime");
const countdownOverlay = document.getElementById("countdownOverlay");
const countNum = document.getElementById("countNum");
const successSplash = document.getElementById("successSplash");
const gameOverBox = document.getElementById("gameOverBox");
const gameOverText = document.getElementById("gameOverText");
const timerBar = document.getElementById("timerBar");
const qTimerBar = document.getElementById("qTimerBar");
const soundBtn = document.getElementById("soundBtn");
const setLabel = document.getElementById("setLabel");
const streakVis = document.getElementById("streakVis");

/* Helpers (no-ops if null) */
const setText = (el, txt) => { if (el) el.textContent = txt; };
const setStyle = (el, prop, val) => { if (el && el.style) el.style[prop] = val; };
const show = (el, on=true) => { if (el) el.style.display = on ? "" : "none"; };
const addCls = (el, cls) => { if (el) el.classList.add(cls); };
const remCls = (el, cls) => { if (el) el.classList.remove(cls); };

/* Only run game on quiz page */
const onQuizPage = qBox && choicesDiv;
if (!onQuizPage) {
  // still wire sound button if present
  soundBtn?.addEventListener("click", ()=>{
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
  });
} else {

/* Start splash */
function killStartSplash() {
  const s = document.getElementById('startSplash');
  if (!s || s.dataset.dismissed === '1') return;
  s.dataset.dismissed = '1';
  addCls(s,'hiding');
  setTimeout(()=> s.remove(), 420);
}
document.addEventListener('DOMContentLoaded', () => setTimeout(killStartSplash, 900));
window.addEventListener('load', () => setTimeout(killStartSplash, 900));
setTimeout(killStartSplash, 4000);

/* Audio + haptics */
function beep(freq=600, dur=0.25) {
  if (!soundOn) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = 0.25;
    const t0 = ctx.currentTime;
    osc.start(t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.stop(t0 + dur + 0.02);
  } catch {}
}
const beepTick = () => beep(620, 0.22);
const beepGo   = () => beep(950, 0.28);
const sfxCorrect   = () => beep(1020, 0.18);
const sfxIncorrect = () => beep(220, 0.2);
const tickSoft     = () => beep(740, 0.08);
function vibrate(ms=100){ if (navigator.vibrate) navigator.vibrate(ms); }

/* CSV */
function fetchCSV(){
  return new Promise((resolve, reject) => {
    Papa.parse(CSV_URL, {
      download:true, header:true, skipEmptyLines:true,
      complete:(res)=>resolve(res.data || []),
      error:(err)=>reject(err)
    });
  });
}

/* Utils */
function formatTime(sec){ const m=Math.floor(sec/60), s=sec%60; return `${m}:${s<10?'0':''}${s}`; }
function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function norm(x){ return String(x ?? "").trim().toLowerCase(); }

/* Resolve correct text (defensive) */
function resolveCorrectText(q) {
  if (!q) return "";
  const Q = (k) => q[k] ?? q[k?.toLowerCase?.()] ?? q[k?.toUpperCase?.()];
  const ansRaw = norm(Q('Answer'));
  const letterMap = { a:'OptionA', b:'OptionB', c:'OptionC', d:'OptionD' };

  if (['a','b','c','d'].includes(ansRaw)) return Q(letterMap[ansRaw]) ?? "";
  if (['optiona','optionb','optionc','optiond'].includes(ansRaw)) {
    const key = 'Option' + ansRaw.slice(-1).toUpperCase();
    return Q(key) ?? "";
  }
  return Q('Answer') ?? "";
}

/* Row validity */
function isValidRow(row){
  if (!row) return false;
  const get = (k)=> row[k] ?? row[k?.toLowerCase?.()] ?? row[k?.toUpperCase?.()];
  const hasQ = !!norm(get('Question'));
  const opts = ['OptionA','OptionB','OptionC','OptionD'].map(k=>get(k)).filter(Boolean);
  return hasQ && opts.length >= 2;
}

/* Streak bar */
function buildStreakBar() {
  if (!streakVis) return;
  streakVis.innerHTML = "";
  for (let i=0;i<12;i++){
    const dot = document.createElement('div');
    dot.className = 'streak-dot';
    dot.dataset.index = i;
    streakVis.appendChild(dot);
  }
}
function markStreak(index, ok) {
  const dot = streakVis?.querySelector(`.streak-dot[data-index="${index}"]`);
  if (!dot) return;
  remCls(dot,'is-correct'); remCls(dot,'is-wrong');
  addCls(dot, ok ? 'is-correct' : 'is-wrong');
}

/* Redemption animation (Option A) */
function redeemOneWrongDot(){
  if (!streakVis) return;
  const wrongs = [...streakVis.querySelectorAll('.streak-dot.is-wrong')];
  if (!wrongs.length) return;

  // Prefer most recent wrong BEFORE current question; fallback to last wrong
  let target = wrongs.reverse().find(d => Number(d.dataset.index) < currentIndex) || wrongs[0];

  // Animate: add redeem class; then clear wrong state to neutral after animation
  target.classList.add('redeem');
  setTimeout(() => {
    target.classList.remove('is-wrong','redeem'); // back to glass neutral
  }, 900);
}

/* Question timer */
function startQuestionTimer(onTimeout) {
  stopQuestionTimer();
  qRemaining = QUESTION_TIME_MS;
  qLastTickSec = 3;
  qTimerBar?.classList.remove('warn');
  setStyle(qTimerBar,'width','100%');

  qTimer = setInterval(() => {
    qRemaining -= QUESTION_TICK_MS;
    const pct = Math.max(0, qRemaining / QUESTION_TIME_MS) * 100;
    setStyle(qTimerBar,'width', pct + '%');

    const secsLeft = Math.ceil(qRemaining / 1000);
    if (qRemaining <= 3000) {
      qTimerBar?.classList.add('warn');
      if (secsLeft > 0 && secsLeft < qLastTickSec + 1) {
        tickSoft(); qLastTickSec = secsLeft;
      }
    }
    if (qRemaining <= 0) { stopQuestionTimer(); onTimeout?.(); }
  }, QUESTION_TICK_MS);
}
function stopQuestionTimer() { if (qTimer) { clearInterval(qTimer); qTimer = null; } }

/* Game flow */
async function startGame() {
  clearTimeout(successAutoNav);
  try {
    successSplash?.classList.remove('show');
    setText(setLabel,'Loading…');

    const data = await fetchCSV();
    const safe = data.filter(isValidRow);
    if (safe.length === 0) throw new Error("No valid questions in CSV");

    questions = shuffleArray(safe).slice(0,12);
    currentIndex = 0; score = 0; wrongTotal = 0; correctSinceLastWrong = 0; elapsed = 0;

    setText(pillScore,"Score 0");
    setText(progressLabel,"Q 0/12");
    show(gameOverBox,false); show(playAgainBtn,false); remCls(playAgainBtn,'pulse');
    setText(setLabel,'Ready');

    buildStreakBar();

    // Countdown
    let n = 3;
    setText(countNum, n);
    if (countdownOverlay) countdownOverlay.hidden = false;
    const int = setInterval(() => {
      n--;
      if (n > 0) {
        setText(countNum, n);
        if (countNum){ countNum.style.animation = "none"; void countNum.offsetWidth; countNum.style.animation = "popIn .4s ease"; }
        beepTick();
      } else {
        clearInterval(int);
        setText(countNum, "GO");
        if (countNum){ countNum.style.animation = "none"; void countNum.offsetWidth; countNum.style.animation = "popIn .4s ease"; }
        beepGo();
        setTimeout(()=>{ if (countdownOverlay) countdownOverlay.hidden = true; beginQuiz(); }, 380);
      }
    }, 700);
  } catch (e) {
    setText(qBox, "Could not load today’s quiz. Please try again later.");
    setText(setLabel, 'Error');
    console.error(e);
  }
}

function beginQuiz() {
  elapsed = 0;
  setText(elapsedTimeEl,"0:00");
  setStyle(timerBar,'width',"0%");
  clearInterval(elapsedInterval);
  elapsedInterval = setInterval(()=>{
    elapsed++;
    setText(elapsedTimeEl, formatTime(elapsed));
    const pct = Math.min(100, (elapsed/300)*100);
    setStyle(timerBar,'width', pct + "%");
  },1000);
  showQuestion();
}

function showQuestion() {
  if (!Array.isArray(questions) || currentIndex >= questions.length) return endGame();

  const q = questions[currentIndex]; if (!q) { currentIndex++; return showQuestion(); }
  const Q = (k) => q[k] ?? q[k?.toLowerCase?.()] ?? q[k?.toUpperCase?.()];
  const correctText = resolveCorrectText(q);

  setText(qBox, Q('Question') || "—");
  if (choicesDiv) choicesDiv.innerHTML = "";

  let opts = [];
  ['OptionA','OptionB','OptionC','OptionD'].forEach((k)=>{
    const val = Q(k); if (!val) return;
    const isCorrect = norm(val) === norm(correctText);
    opts.push({ text: String(val), isCorrect });
  });

  if (!opts.some(o => o.isCorrect) && opts.length > 0) opts[0].isCorrect = true;
  if (opts.length < 2) { currentIndex++; return showQuestion(); }

  opts = shuffleArray(opts);
  opts.forEach(opt => {
    const b = document.createElement("button");
    b.textContent = opt.text;
    b.onclick = () => handleAnswer(b, opt.isCorrect);
    choicesDiv?.appendChild(b);
  });

  setText(progressLabel, `Q ${Math.min(currentIndex+1, 12)}/12`);
  startQuestionTimer(() => handleTimeout());
}

function handleTimeout() {
  sfxIncorrect(); vibrate(160);
  registerWrong();
  advanceOrEnd();
}

function handleAnswer(btn, isCorrect) {
  stopQuestionTimer();
  [...(choicesDiv?.querySelectorAll("button") || [])].forEach(b=>b.disabled=true);

  if (isCorrect) {
    btn.classList.add("correct");
    sfxCorrect(); vibrate(60);
    score++; setText(pillScore, `Score ${score}`);
    registerCorrect();
  } else {
    btn.classList.add("incorrect");
    sfxIncorrect(); vibrate(160);
    registerWrong();
  }

  setTimeout(()=> advanceOrEnd(), 800);
}

/* Rule helpers */
function registerCorrect(){
  markStreak(currentIndex, true);
  correctSinceLastWrong++;
  if (correctSinceLastWrong >= 3 && wrongTotal > 0) {
    redeemOneWrongDot();     // ← premium animation
    wrongTotal--;
    correctSinceLastWrong = 0;
  }
}
function registerWrong(){
  markStreak(currentIndex, false);
  wrongTotal++;
  correctSinceLastWrong = 0;
}
function advanceOrEnd(){
  if (wrongTotal >= 3) { endGame("3 incorrect — game over!"); return; }
  currentIndex++;
  if (currentIndex >= 12) endGame();
  else showQuestion();
}

function endGame(msg="") {
  clearInterval(elapsedInterval); stopQuestionTimer();

  if (msg) {
    setText(gameOverText, msg);
    show(gameOverBox,true); show(playAgainBtn,true); addCls(playAgainBtn,'pulse');
  } else {
    if (countdownOverlay) countdownOverlay.hidden = true;
    successSplash?.removeAttribute('aria-hidden');
    successSplash?.classList.remove('show'); void successSplash?.offsetWidth;
    successSplash?.classList.add('show');

    clearTimeout(successAutoNav);
    successAutoNav = setTimeout(() => {
      successSplash?.classList.remove('show');
      setText(qBox, "Press Start to Play");
      setText(pillScore, "Score 0");
      setText(progressLabel, "Q 0/12");
      setStyle(timerBar,'width',"0%");
      buildStreakBar();
    }, 3000);
  }
}

/* Wire UI */
startBtn?.addEventListener("click", startGame);
shuffleBtn?.addEventListener("click", ()=>{
  shuffleArray(questions);
  currentIndex=0; wrongTotal=0; correctSinceLastWrong=0;
  buildStreakBar(); showQuestion();
});
shareBtn?.addEventListener("click", ()=>{
  const text = `I'm playing Brain ⚡ Bolt! Current score: ${score}/12`;
  if (navigator.share) navigator.share({title:"Brain ⚡ Bolt", text, url: location.href}).catch(()=>{});
  else navigator.clipboard?.writeText(`${text} - ${location.href}`);
});
playAgainBtn?.addEventListener("click", startGame);
soundBtn?.addEventListener("click", ()=>{
  soundOn = !soundOn;
  soundBtn.textContent = soundOn ? "🔊" : "🔇";
});

} // end onQuizPage guard
