/**
 * game/core.js — v7000
 * Core loop for Levels 1–3, XP, streaks, posters, SFX, timers.
 *
 * Expected DOM ids (lightweight):
 *  - #quizLayer, #questionBox, #choices, #progressLabel, #elapsedTime, #qTimerBar
 *  - #streakFill, #streakLabel, #levelLabel
 *  - #countdownOverlay, #countNum
 *  - #perfectBurst, #sfxPerfect (audio)
 *  - #heroPoster (img)  — optional, swaps per level
 *  - Start/controls: #btnStart, #btnHow, #btnResume, #btnReset, #btnQuit
 *  - #gameOverBox, #gameOverText, #playAgainBtn, #shareBtn, #shuffleBtn
 */
import { GameRules } from '/js/config/gameRules.js';
import { getEntitlements } from '/js/state/entitlements.js';
import { loadQuestionsForToday } from '/js/questions.js';

// ---- small DOM helpers
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Elements
const quizLayer = $('#quizLayer');
const questionBox = $('#questionBox');
const choicesEl = $('#choices');
const progressLabel = $('#progressLabel');
const elapsedEl = $('#elapsedTime');
const qTimerBar = $('#qTimerBar');
const streakFill = $('#streakFill');
const streakLabel = $('#streakLabel');
const levelLabel = $('#levelLabel');
const countdownOverlay = $('#countdownOverlay');
const countNum = $('#countNum');
const perfectBurst = $('#perfectBurst');
const sfxPerfect = $('#sfxPerfect');

// Controls
const btnStart = $('#btnStart');
const btnHow = $('#btnHow');
const btnResume = $('#btnResume');
const btnReset = $('#btnReset');
const btnQuit = $('#btnQuit');

// ---- SFX
const SFX = Object.fromEntries(Object.entries(GameRules.sfx)
  .map(([k, path]) => [k, new Audio(path)]));

// ---- State
let state = makeInitialState();

function makeInitialState(){
  return {
    level: 1,
    qIndex: 0,        // 0..11 for current level
    correctInRow: 0,
    wrongCount: 0,
    totalCorrect: 0,
    totalAsked: 0,
    startedAt: 0,
    timerHandle: null,
    running: false,
    levelCounts: {1:0,2:0,3:0},
    levelCorrects: {1:0,2:0,3:0},
    perfectLevels: [],       // e.g. [1,3]
    currentSet: [],          // 36 questions
    xp: 0,
    levelClears: 0
  };
}

// ---- Time formatting
function fmtTime(ms){
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  const r = s % 60;
  return `${m}:${r<10?'0':''}${r}`;
}

// ---- Streak handling
function getDailyKey(){ return new Date().toISOString().slice(0,10); }
function getDailyStreak(){ return Number(localStorage.getItem(GameRules.streak.storageKey) || '0'); }
function setDailyStreak(v){ localStorage.setItem(GameRules.streak.storageKey, String(v)); }
function markTodayComplete(){
  const today = getDailyKey();
  const lastKey = GameRules.streak.lastDateKey;
  const lastDate = localStorage.getItem(lastKey);
  let streak = getDailyStreak();
  if (lastDate === today) return; // already counted
  const prev = new Date(lastDate || today); prev.setDate(prev.getDate()+1);
  const prevStr = prev.toISOString().slice(0,10);
  if (!lastDate || prevStr === today){ streak = streak + 1; } else { streak = 1; }
  setDailyStreak(streak);
  localStorage.setItem(lastKey, today);
}

// ---- UI header
function updateHeader(){
  const totalToAsk = GameRules.session.questionsPerLevel * GameRules.session.levels.length;
  const pct = Math.min(100, Math.floor((state.totalAsked/totalToAsk)*100));
  streakFill && (streakFill.style.width = pct + '%');

  const dayStreak = getDailyStreak();
  if (streakLabel) streakLabel.textContent = `Streak: ${dayStreak} day${dayStreak===1?'':'s'}`;
  if (levelLabel) levelLabel.textContent = `Level ${state.level}`;
}

// ---- Posters
function setPosterForLevel(level){
  const ent = getEntitlements();
  const posterMap = GameRules.posters;
  const path = posterMap[level] || posterMap.start;
  const hero = $('#heroPoster');
  if (hero) hero.src = path;
  // optional: ambient poster for Pro users (night)
  if (ent.isPro && level === 3 && posterMap.night && hero) hero.src = posterMap.night;
}

// ---- Begin / Timer
function beginLevel(level){
  state.level = level;
  state.qIndex = 0;
  state.correctInRow = 0;
  state.levelCounts[level] = 0;
  state.levelCorrects[level] = 0;
  setPosterForLevel(level);
  updateHeader();
}

function elapsedTick(){
  if (!state.running) return;
  elapsedEl && (elapsedEl.textContent = fmtTime(Date.now() - state.startedAt));
  state.timerHandle = setTimeout(elapsedTick, 250);
}

function qTimerStart(){
  const sec = GameRules.session.perQuestionSeconds;
  const start = performance.now();
  const dur = sec * 1000;
  function step(ts){
    if (!state.running) return;
    const p = Math.min(1, (ts-start)/dur);
    if (qTimerBar) qTimerBar.style.width = (p*100)+'%';
    if (p<1) requestAnimationFrame(step);
  }
  if (qTimerBar) qTimerBar.style.width = '0%';
  requestAnimationFrame(step);
}

// ---- Questions
function showQuestion(){
  const lv = state.level;
  const perLevel = GameRules.session.questionsPerLevel;
  const subset = state.currentSet.filter(q=>q.Level===lv);
  const q = subset[state.qIndex] || null;
  if (!q){
    // level finished
    const correct = state.levelCorrects[lv] || 0;
    const asked = state.levelCounts[lv] || 0;
    const perfect = (asked === perLevel && correct === perLevel);
    if (perfect && !state.perfectLevels.includes(lv)) state.perfectLevels.push(lv);
    if (perfect) triggerPerfect();

    // XP bonuses
    state.xp += GameRules.xp.perLevelClearBonus;
    if (perfect) state.xp += GameRules.xp.perfectLevelBonus;

    state.levelClears++;

    if (lv < 3){
      SFX.levelUp?.play().catch(()=>{});
      beginLevel(lv + 1);
      showQuestion();
      return;
    }

    // all done — session complete
    state.running = false;
    clearTimeout(state.timerHandle);
    markTodayComplete();
    state.xp += GameRules.xp.dailyCompletionBonus;
    const over = $('#gameOverBox');
    if (over) over.hidden = false;
    const txt = $('#gameOverText');
    if (txt) txt.textContent = 'All levels complete — see you tomorrow!';
    return;
  }

  if (progressLabel) progressLabel.textContent = `Q ${state.qIndex+1}/${perLevel}`;
  if (questionBox) questionBox.textContent = q.Question;
  if (choicesEl) choicesEl.innerHTML = '';

  // Shuffle answers but remember correct
  const indices = [0,1,2,3].filter(i => i < q.Answers.length);
  const shuffled = shuffle(indices);
  const correctIndex = q.CorrectIndex ?? 0;
  shuffled.forEach((ansIdx) => {
    const b = document.createElement('button');
    b.textContent = q.Answers[ansIdx];
    b.addEventListener('click', () => onAnswer(ansIdx === correctIndex, q));
    choicesEl.appendChild(b);
  });

  qTimerStart();
}

function shuffle(arr){
  const a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function onAnswer(isCorrect, q){
  state.totalAsked++;
  state.levelCounts[state.level]++;

  if (isCorrect){
    state.totalCorrect++;
    state.levelCorrects[state.level]++;
    state.correctInRow++;
    state.xp += GameRules.xp.perCorrect;
    SFX.correct?.play().catch(()=>{});
    flashChoice(true);
    if (state.correctInRow >= GameRules.session.redemptionStreak && state.wrongCount > 0) {
      state.wrongCount = Math.max(0, state.wrongCount - 1);
    }
  } else {
    state.correctInRow = 0;
    state.wrongCount++;
    navigator.vibrate?.(40);
    SFX.wrong?.play().catch(()=>{});
    flashChoice(false);
  }

  updateHeader();
  state.qIndex++;
  setTimeout(showQuestion, 400);
}

function flashChoice(ok){
  if (!choicesEl) return;
  choicesEl.classList.remove('blink-ok','blink-bad');
  // force reflow
  void choicesEl.offsetWidth;
  choicesEl.classList.add(ok ? 'blink-ok' : 'blink-bad');
  setTimeout(()=> choicesEl.classList.remove('blink-ok','blink-bad'), 300);
}

function triggerPerfect(){
  perfectBurst?.classList.add('active');
  try { sfxPerfect?.play(); } catch {}
  setTimeout(()=> perfectBurst?.classList.remove('active'), 1200);
}

// ---- Start & Controls
function startCountdownThenStart(){
  if (!countdownOverlay || !countNum) return startGame();

  countdownOverlay.classList.remove('hidden');
  [3,2,1].forEach((n,idx)=>{
    setTimeout(()=>{ countNum.textContent = String(n); }, idx*800);
  });
  setTimeout(()=>{ countNum.textContent = 'Go'; SFX.start?.play().catch(()=>{}); }, 2400);
  setTimeout(()=>{
    countdownOverlay.classList.add('hidden');
    startGame();
  }, 3000);
}

function startGame(){
  if (quizLayer) quizLayer.hidden = false;
  state.running = true;
  state.startedAt = Date.now();
  elapsedTick();
  beginLevel(1);
  showQuestion();
}

function resetSession(){
  const keepSet = state.currentSet;
  state = makeInitialState();
  state.currentSet = keepSet;
  if (qTimerBar) qTimerBar.style.width = '0%';
  if (progressLabel) progressLabel.textContent = `Q 0/${GameRules.session.questionsPerLevel}`;
  if (questionBox) questionBox.textContent = 'Press Start to Play';
  if (choicesEl) choicesEl.innerHTML = '';
  const over = $('#gameOverBox'); if (over) over.hidden = true;
  updateHeader();
}

function onQuit(){
  if (state.level >= 2) {
    const ok = confirm('Quit the session? Progress in this level will be lost.');
    if (!ok) return;
  }
  if (quizLayer) quizLayer.hidden = true;
  resetSession();
}

// ---- Wire once
(async function init(){
  try {
    $('#yy') && ($('#yy').textContent = new Date().getFullYear());
    updateHeader();
    // Load questions
    state.currentSet = await loadQuestionsForToday();
  } catch (err) {
    console.error('Failed to load questions; using seed', err);
    state.currentSet = await (async()=> {
      const mod = await import('/js/questions.js');
      return mod.loadQuestionsForToday();
    })();
  }

  btnStart?.addEventListener('click', startCountdownThenStart);
  btnHow?.addEventListener('click', ()=> alert('Three levels. 3-in-a-row redemption. Finish at least one level daily to keep your streak.'));
  btnResume?.addEventListener('click', ()=> { quizLayer && (quizLayer.hidden = false); });
  btnReset?.addEventListener('click', resetSession);
  btnQuit?.addEventListener('click', onQuit);

  $('#shuffleBtn')?.addEventListener('click', ()=>{
    state.currentSet = shuffle(state.currentSet);
    state.qIndex = 0; showQuestion();
  });
  $('#shareBtn')?.addEventListener('click', ()=>{
    const txt = `I’m playing Whylee! Day streak: ${getDailyStreak()} — try it: ${location.origin}`;
    if (navigator.share){ navigator.share({title:'Whylee', text:txt, url:location.origin}).catch(()=>{}); }
    else { prompt('Copy link', location.origin); }
  });
  $('#playAgainBtn')?.addEventListener('click', ()=>{
    resetSession();
    beginLevel(1);
    showQuestion();
  });
})();
