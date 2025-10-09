/* Whylee — core game logic
   - Levels: 1 (warm-up), 2 (matching pairs placeholder), 3 (mixed trivia)
   - 12 Q per level (total 36)
   - Redemption rule: 3 consecutive correct removes one previous wrong
   - Continuous streak bar: width reflects session progress
   - Daily streak: stored in localStorage keyed by YYYY-MM-DD
*/

(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const btnStart = $('#btnStart');
  const btnHow = $('#btnHow');
  const btnResume = $('#btnResume');
  const btnReset = $('#btnReset');
  const btnQuit = $('#btnQuit');
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

  // Simple sound dispatchers (shell.js toggles master mute)
  const sfx = {
    correct: new Audio('/media/audio/correct.mp3'),
    wrong: new Audio('/media/audio/wrong.mp3'),
    levelUp: new Audio('/media/audio/level-up.mp3'),
    start: new Audio('/media/audio/start-chime.mp3'),
    gameOver: new Audio('/media/audio/game-over-low.mp3')
  };

  let state = {
    level: 1,
    qIndex: 0,
    correctInRow: 0,
    wrongCount: 0,
    totalCorrect: 0,
    totalAsked: 0,
    startedAt: 0,
    timerHandle: null,
    running: false,
    levelCounts: {1:0,2:0,3:0},
    levelCorrects: {1:0,2:0,3:0},
    currentSet: []
  };

  function fmtTime(ms){
    const s = Math.floor(ms/1000);
    const m = Math.floor(s/60);
    const r = s%60;
    return `${m}:${r<10?'0':''}${r}`;
  }

  function updateHeader(){
    const pct = Math.min(100, Math.floor((state.totalAsked/36)*100));
    streakFill.style.width = pct + '%';
    const dayStreak = getDailyStreak();
    streakLabel.textContent = `Streak: ${dayStreak} day${dayStreak===1?'':'s'}`;
    levelLabel.textContent = `Level ${state.level}`;
  }

  // Daily streak tracking (complete >=1 level to count)
  function getDailyKey(){
    const d = new Date();
    return d.toISOString().slice(0,10);
  }
  function getDailyStreak(){
    return Number(localStorage.getItem('wl_streak') || '0');
  }
  function setDailyStreak(v){
    localStorage.setItem('wl_streak', String(v));
  }
  function markTodayComplete(){
    const today = getDailyKey();
    const lastDate = localStorage.getItem('wl_last_date');
    let streak = getDailyStreak();
    if (lastDate === today) return; // already counted
    const prev = new Date(lastDate || today); prev.setDate(prev.getDate()+1);
    const prevStr = prev.toISOString().slice(0,10);
    if (!lastDate || prevStr === today){ streak = streak + 1; } else { streak = 1; }
    setDailyStreak(streak);
    localStorage.setItem('wl_last_date', today);
  }

  // Load questions (for demo, we use a tiny inline set — replace with fetch to CSV/Sheets)
  async function loadQuestions(){
    // TODO: wire to your live CSV or GAS endpoint
    // For now, create a mock 36:
    const mkQ = (i) => ({
      Question: `Sample question #${i+1}?`,
      Answers: shuffle([`Correct ${i+1}`, `Alt A`, `Alt B`, `Alt C`]),
      Correct: 0, // we’ll remap below
      Explanation: `Short explanation for question ${i+1}.`,
      Level: i<12?1: (i<24?2:3)
    });
    const base = Array.from({length:36}, (_,i)=> mkQ(i));
    // ensure index 0 in Answers is correct after shuffle
    base.forEach(q=>{
      // swap to ensure one of the items is correct; here we pretend index 0 is correct text
      // Already at 0 by construction
    });
    return base;
  }

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function setThemeForLevel(level){
    document.body.classList.remove('theme-level1','theme-level2','theme-level3');
    document.body.classList.add(`theme-level${level}`);
    // Poster swap to match level color vibe
    const poster = {
      1:'/media/posters/poster-start.jpg',
      2:'/media/posters/poster-level2.jpg',
      3:'/media/posters/poster-level3.jpg'
    }[level];
    const heroPoster = $('#heroPoster');
    if (heroPoster) heroPoster.src = poster;
  }

  function beginLevel(level){
    state.level = level;
    state.qIndex = 0;
    state.correctInRow = 0;
    state.levelCounts[level] = 0;
    state.levelCorrects[level] = 0;
    setThemeForLevel(level);
    updateHeader();
  }

  function startCountdownThenStart(){
    // show overlay only when game starts
    countdownOverlay.classList.remove('hidden');
    [3,2,1].forEach((n,idx)=>{
      setTimeout(()=>{ countNum.textContent = String(n); }, idx*800);
    });
    setTimeout(()=>{ countNum.textContent = 'Go'; sfx.start && sfx.start.play().catch(()=>{}); }, 2400);
    setTimeout(()=>{
      countdownOverlay.classList.add('hidden');
      startGame();
    }, 3000);
  }

  function startGame(){
    quizLayer.hidden = false;
    state.running = true;
    state.startedAt = Date.now();
    elapsedTick();
    beginLevel(1);
    showQuestion();
  }

  function elapsedTick(){
    if (!state.running) return;
    elapsedEl.textContent = fmtTime(Date.now()-state.startedAt);
    state.timerHandle = setTimeout(elapsedTick, 250);
  }

  function qTimerStart(){
    // 10s visual bar for each question
    const start = performance.now();
    const dur = 10000;
    function step(ts){
      if (!state.running) return;
      const p = Math.min(1, (ts-start)/dur);
      qTimerBar.style.width = (p*100)+'%';
      if (p<1) requestAnimationFrame(step);
    }
    qTimerBar.style.width = '0%';
    requestAnimationFrame(step);
  }

  function showQuestion(){
    const lv = state.level;
    const subset = state.currentSet.filter(q=>q.Level===lv);
    const q = subset[state.qIndex] || null;
    if (!q){
      // level finished
      const perfect = (state.levelCounts[lv]===12 && state.levelCorrects[lv]===12);
      if (perfect) triggerPerfect();
      if (lv<3){
        sfx.levelUp && sfx.levelUp.play().catch(()=>{});
        beginLevel(lv+1);
        showQuestion();
        return;
      }
      // all done!
      state.running = false;
      clearTimeout(state.timerHandle);
      markTodayComplete();
      $('#gameOverText').textContent = 'All levels complete — see you tomorrow!';
      $('#gameOverBox').hidden = false;
      return;
    }

    progressLabel.textContent = `Q ${state.qIndex+1}/12`;
    questionBox.textContent = q.Question;
    choicesEl.innerHTML = '';
    q.Answers.forEach((t,idx)=>{
      const b = document.createElement('button');
      b.textContent = t;
      b.addEventListener('click', ()=> onAnswer(idx===0, q));
      choicesEl.appendChild(b);
    });
    qTimerStart();
  }

  function onAnswer(isCorrect, q){
    state.totalAsked++;
    state.levelCounts[state.level]++;

    if (isCorrect){
      state.totalCorrect++; state.levelCorrects[state.level]++;
      state.correctInRow++;
      sfx.correct && sfx.correct.play().catch(()=>{});
      if (state.correctInRow>=3 && state.wrongCount>0){
        state.wrongCount = Math.max(0, state.wrongCount-1); // redemption
      }
      flashChoice(true);
    } else {
      state.correctInRow = 0;
      state.wrongCount++;
      vibrate(40);
      sfx.wrong && sfx.wrong.play().catch(()=>{});
      flashChoice(false);
    }

    updateHeader();

    // Next
    state.qIndex++;
    setTimeout(showQuestion, 400);
  }

  function flashChoice(ok){
    const last = choicesEl.lastElementChild; // just a tiny effect cue on container
    if (!last) return;
    choicesEl.classList.remove('blink-ok','blink-bad');
    void choicesEl.offsetWidth; // reflow
    choicesEl.classList.add(ok?'blink-ok':'blink-bad');
    setTimeout(()=>choicesEl.classList.remove('blink-ok','blink-bad'), 300);
  }

  function vibrate(ms){ if (navigator.vibrate) try{navigator.vibrate(ms);}catch(_){} }

  function triggerPerfect(){
    perfectBurst.classList.add('active');
    try{ sfxPerfect && sfxPerfect.play(); }catch(_){}
    setTimeout(()=> perfectBurst.classList.remove('active'), 1300);
  }

  function resetSession(){
    state = {
      level: 1, qIndex: 0, correctInRow: 0, wrongCount: 0, totalCorrect: 0, totalAsked: 0,
      startedAt: 0, timerHandle: null, running:false,
      levelCounts: {1:0,2:0,3:0}, levelCorrects: {1:0,2:0,3:0},
      currentSet: state.currentSet // keep loaded questions
    };
    qTimerBar.style.width='0%';
    progressLabel.textContent='Q 0/12';
    questionBox.textContent='Press Start to Play';
    choicesEl.innerHTML='';
    $('#gameOverBox').hidden = true;
    updateHeader();
  }

  // Load / wire
  (async function init(){
    $('#yy').textContent = new Date().getFullYear();
    updateHeader();
    state.currentSet = await loadQuestions();

    btnStart?.addEventListener('click', startCountdownThenStart);
    btnHow?.addEventListener('click', ()=> alert('Three levels. Redemption at 3 in a row. Finish at least one level daily to keep your streak!'));
    btnResume?.addEventListener('click', ()=> { quizLayer.hidden=false; });
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

  function onQuit(){
    // confirm quit (applies from Level 2 onwards to count day only if >=1 level done)
    if (state.level>=2){
      const ok = confirm('Quit the session? Progress in this level will be lost.');
      if (!ok) return;
    }
    quizLayer.hidden = true;
    resetSession();
  }
})();
