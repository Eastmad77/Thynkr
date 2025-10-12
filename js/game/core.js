/* =========================================================
   Whylee v7 — Core Game Logic
   - Levels 1..3, 12 questions each
   - Redemption: 3 consecutive correct removes one wrong
   - Daily streak mechanic
   - Minimal mock questions (replace with CSV/Firestore later)
   ========================================================= */
window.WhyleeGameCore = (() => {
  const $ = s => document.querySelector(s);

  // UI refs (resolved at init)
  let btnStart, btnHow, btnReset, qBox, choicesEl, progressLabel, elapsedEl, qTimerBar, perfectBurst, sfxPerfect, levelLabel;

  // SFX
  const sfx = {
    correct: new Audio('/media/audio/correct.mp3'),
    wrong: new Audio('/media/audio/wrong.mp3'),
    levelUp: new Audio('/media/audio/level-up.mp3'),
    start: new Audio('/media/audio/start-chime.mp3'),
    gameOver: new Audio('/media/audio/game-over-low.mp3')
  };

  // State
  let state = null;
  function baseState(){
    return {
      level: 1,
      qIndex: 0,
      consecutive: 0,
      wrongCount: 0,
      totalCorrect: 0,
      totalAsked: 0,
      startedAt: 0,
      timerHandle: null,
      running: false,
      levelCounts: {1:0,2:0,3:0},
      levelCorrects: {1:0,2:0,3:0},
      set: []
    };
  }

  // Utils
  function fmt(ms){ const s = Math.floor(ms/1000), m = Math.floor(s/60), r = s%60; return `${m}:${r<10?'0':''}${r}`; }
  function vibrate(ms){ if (navigator.vibrate) try{ navigator.vibrate(ms); }catch{} }
  function shuffle(arr){ const a = arr.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }

  // Daily streak storage
  const KEY_STREAK = 'wl_streak';
  const KEY_LAST = 'wl_last_date';
  const todayKey = () => new Date().toISOString().slice(0,10);
  const getStreak = () => Number(localStorage.getItem(KEY_STREAK) || '0');
  const setStreak = (n) => localStorage.setItem(KEY_STREAK, String(n));
  function markTodayIfQualified(){
    const today = todayKey();
    const last = localStorage.getItem(KEY_LAST);
    if (last === today) return;
    let s = getStreak();
    if (!last) s = 1;
    else {
      const prev = new Date(last); prev.setDate(prev.getDate() + 1);
      const prevStr = prev.toISOString().slice(0,10);
      s = (prevStr === today) ? s + 1 : 1;
    }
    setStreak(s);
    localStorage.setItem(KEY_LAST, today);
  }

  // Questions (mock)
  async function loadQuestions(){
    // Replace with fetch('/media/questions/sample-questions.csv') when wired
    const mk = (i) => ({
      q: `Sample question #${i+1}?`,
      options: shuffle([`Correct ${i+1}`, `Alt A`, `Alt B`, `Alt C`]),
      correctIndex: 0, // we treat index 0 as correct for the mock
      level: (i<12) ? 1 : (i<24 ? 2 : 3)
    });
    return Array.from({length:36}, (_,i)=> mk(i));
  }

  // Header/Progress
  function paintHeader(){
    if (!levelLabel) return;
    levelLabel.textContent = `Level ${state.level}`;
    progressLabel.textContent = `Q ${state.qIndex+1}/12`;
    // XP & streak bars (cosmetic demo)
    const xpPct = Math.min(100, Math.floor((state.totalCorrect * 100) / 36));
    const stPct = Math.min(100, Math.floor((getStreak() % 7) * (100/7)));
    const xpBar = $('#xpBar'); const streakBar = $('#streakBar');
    if (xpBar) xpBar.style.width = xpPct + '%';
    if (streakBar) streakBar.style.width = stPct + '%';
  }

  // Timer
  function elapsedTick(){
    if (!state.running) return;
    elapsedEl.textContent = fmt(Date.now() - state.startedAt);
    state.timerHandle = setTimeout(elapsedTick, 250);
  }
  function qTimerStart(){
    const start = performance.now(), dur = 10000;
    qTimerBar.style.width = '0%';
    function step(ts){
      if (!state.running) return;
      const p = Math.min(1, (ts - start) / dur);
      qTimerBar.style.width = (p*100) + '%';
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Flow
  function beginLevel(l){
    state.level = l; state.qIndex = 0; state.consecutive = 0;
    state.levelCounts[l] = 0; state.levelCorrects[l] = 0;
    paintHeader();
  }

  function showQuestion(){
    const lv = state.level;
    const subset = state.set.filter(x => x.level === lv);
    const q = subset[state.qIndex] || null;
    if (!q){
      // done this level
      const perfect = (state.levelCounts[lv]===12 && state.levelCorrects[lv]===12);
      if (perfect){ // visual celebrate
        try{ sfxPerfect?.play(); }catch{} 
        perfectBurst?.classList.add('active');
        setTimeout(()=> perfectBurst?.classList.remove('active'), 1000);
      }
      if (lv < 3){
        try{ sfx.levelUp?.play(); }catch{}
        beginLevel(lv+1);
        showQuestion();
        return;
      }
      // finished all
      finalizeSession();
      return;
    }

    paintHeader();
    qBox.textContent = q.q;
    choicesEl.innerHTML = '';
    q.options.forEach((t, idx) => {
      const b = document.createElement('button');
      b.className = 'btn secondary';
      b.textContent = t;
      b.addEventListener('click', () => onAnswer(idx === 0));
      choicesEl.appendChild(b);
    });
    qTimerStart();
  }

  function onAnswer(correct){
    state.totalAsked++;
    state.levelCounts[state.level]++;

    if (correct){
      state.totalCorrect++;
      state.levelCorrects[state.level]++;
      state.consecutive++;
      try{ sfx.correct?.play(); }catch{}
      if (state.consecutive >= 3 && state.wrongCount > 0){
        state.wrongCount = Math.max(0, state.wrongCount - 1);
      }
      flash(true);
    } else {
      state.consecutive = 0;
      state.wrongCount++;
      vibrate(40);
      try{ sfx.wrong?.play(); }catch{}
      flash(false);
    }

    paintHeader();
    state.qIndex++;
    setTimeout(showQuestion, 360);
  }

  function flash(ok){
    choicesEl.classList.remove('blink-ok','blink-bad');
    void choicesEl.offsetWidth;
    choicesEl.classList.add(ok ? 'blink-ok' : 'blink-bad');
    setTimeout(()=> choicesEl.classList.remove('blink-ok','blink-bad'), 260);
  }

  function finalizeSession(){
    state.running = false;
    clearTimeout(state.timerHandle);
    const correct = state.totalCorrect;
    const streakTriples = Math.floor(correct / 3);
    const levelClears = [1,2,3].filter(l => state.levelCounts[l] >= 12).length;
    const xp = window.WhyleeRules.xpForSession({ correct, levelClears, streakTriples });

    // Persist simple stats
    try {
      const KEY = 'whylee:stats';
      const s = JSON.parse(localStorage.getItem(KEY) || '{}');
      s.xp = (s.xp || 0) + xp;
      s.totalCorrect = (s.totalCorrect || 0) + correct;
      s.sessions = (s.sessions || 0) + 1;
      // Perfects
      s.levelPerfects = s.levelPerfects || {};
      [1,2,3].forEach(l => {
        if (state.levelCounts[l]===12 && state.levelCorrects[l]===12){
          s.levelPerfects[l] = (s.levelPerfects[l] || 0) + 1;
        }
      });
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}

    // Day complete if enough questions
    if (state.totalAsked >= window.WhyleeRules.DAILY_TARGET) markTodayIfQualified();

    const box = document.getElementById('gameOverBox');
    const text = document.getElementById('gameOverText');
    if (box && text){
      text.textContent = 'All levels complete — fantastic session!';
      box.hidden = false;
      try{ sfx.gameOver?.play(); }catch{}
    }
  }

  function reset(){
    state = {
      ...baseState(),
      set: state?.set || []
    };
    if (qTimerBar) qTimerBar.style.width = '0%';
    if (progressLabel) progressLabel.textContent = 'Q 0/12';
    if (qBox) qBox.textContent = 'Press Start to Play';
    if (choicesEl) choicesEl.innerHTML = '';
    const box = document.getElementById('gameOverBox'); if (box) box.hidden = true;
    paintHeader();
  }

  // -------------- Public init --------------
  async function init(){
    // resolve refs within #/play view
    btnStart = $('#btnStart'); btnHow = $('#btnHow'); btnReset = $('#btnReset');
    qBox = $('#questionBox'); choicesEl = $('#choices'); progressLabel = $('#progressLabel');
    elapsedEl = $('#elapsedTime'); qTimerBar = $('#qTimerBar'); levelLabel = $('#levelLabel');
    perfectBurst = $('#perfectBurst'); sfxPerfect = $('#sfxPerfect');

    reset();
    state.set = await loadQuestions();

    btnStart?.addEventListener('click', () => {
      const overlay = $('#countdownOverlay');
      const countNum = $('#countNum');
      overlay?.classList.remove('hidden');
      [3,2,1].forEach((n,i)=> setTimeout(()=> countNum.textContent=String(n), i*800));
      setTimeout(()=>{ countNum.textContent='Go'; try{ sfx.start?.play(); }catch{}; }, 2400);
      setTimeout(()=> {
        overlay?.classList.add('hidden');
        state.running = true; state.startedAt = Date.now(); elapsedTick();
        beginLevel(1); showQuestion();
      }, 3000);
    });

    btnHow?.addEventListener('click', () => {
      alert('Three levels × 12 questions each. 3-in-a-row redeems a previous wrong. Finish ≥12 questions to keep your daily streak!');
    });

    btnReset?.addEventListener('click', reset);

    $('#shareBtn')?.addEventListener('click', () => {
      const txt = `I’m playing Whylee! Day streak: ${getStreak()} — try it: ${location.origin}`;
      if (navigator.share) navigator.share({ title:'Whylee', text:txt, url:location.origin }).catch(()=>{});
      else prompt('Copy link', location.origin);
    });
    $('#playAgainBtn')?.addEventListener('click', () => { reset(); beginLevel(1); showQuestion(); });
  }

  return { init };
})();
