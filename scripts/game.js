/* Whylee — core game logic (v7005)
   Levels: 1 Warm-Up, 2 Pairs, 3 Trivia
   - 12 Q per level (36 total)
   - 3-in-a-row redemption removes one wrong
   - Daily streak tracked (≥1 level cleared)
   - Posters & reflections at milestones
   - Supports Pro upgrade and ad insertion
   - 🔸 Poster IDs: poster-start, poster-levelup, poster-success, poster-night, poster-countdown, poster-perfect, poster-reward, poster-reflection
*/

(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // 🔊 Audio
  const sfx = {
    correct: new Audio('/media/audio/correct.mp3'),
    wrong: new Audio('/media/audio/wrong.mp3'),
    levelUp: new Audio('/media/audio/level-up.mp3'),
    start: new Audio('/media/audio/start-chime.mp3'),
    gameOver: new Audio('/media/audio/game-over-low.mp3'),
    click: new Audio('/media/audio/soft-click.mp3')
  };
  Object.values(sfx).forEach(a=> a && (a.volume = 0.6));

  // 🧠 Game state
  let state = {
    level: 1,
    qIndex: 0,
    correctInRow: 0,
    wrongCount: 0,
    totalCorrect: 0,
    totalAsked: 0,
    startedAt: 0,
    running: false,
    currentSet: [],
    levelStats: {1:{},2:{},3:{}},
  };

  const els = {
    root: $('#quizRoot'),
    levelLabel: $('#levelLabel'),
    streakLabel: $('#streakLabel'),
    progressLabel: $('#progressLabel'),
    questionBox: $('#questionBox'),
    choices: $('#choices'),
    qTimerBar: $('#qTimerBar'),
    elapsed: $('#elapsedTime'),
  };

  // ⏱ Helpers
  function fmtTime(ms){
    const s = Math.floor(ms/1000), m = Math.floor(s/60), r = s%60;
    return `${m}:${r<10?'0':''}${r}`;
  }

  function elapsedTick(){
    if (!state.running || !els.elapsed) return;
    els.elapsed.textContent = fmtTime(Date.now()-state.startedAt);
    setTimeout(elapsedTick, 500);
  }

  // 🔥 Streak functions
  function getDailyKey(){ return new Date().toISOString().slice(0,10); }
  function getStreak(){ return Number(localStorage.getItem('wl_streak')||'0'); }
  function setStreak(v){ localStorage.setItem('wl_streak', String(v)); }
  function markTodayComplete(){
    const today = getDailyKey();
    const lastDate = localStorage.getItem('wl_last_date');
    let streak = getStreak();
    if (lastDate === today) return;
    const prev = new Date((lastDate||today)); prev.setDate(prev.getDate()+1);
    const prevStr = prev.toISOString().slice(0,10);
    if (!lastDate || prevStr === today) streak += 1; else streak = 1;
    setStreak(streak);
    localStorage.setItem('wl_last_date', today);
    if (window.WhyleeAchievements) window.WhyleeAchievements.maybeAwardStreak(streak);
  }

  // 🎬 Posters (image or video for Pro)
  // In game.js, make sure your poster calls use one of these IDs (e.g., show poster-levelup after a strong run).
  function showPoster(name, {autohide=0}={}){
    const base = `/media/posters/v1/${name}`;
    const urlImg = `${base}.png`;
    const urlVid = `${base}.mp4`;
    const overlay = document.createElement('div');
    overlay.className = 'overlay-poster';
    let played = false;

    if (window.WhyleePro?.isPro()){
      const v = document.createElement('video');
      Object.assign(v, { playsInline:true, muted:true, autoplay:true, src:urlVid });
      v.addEventListener('canplay', ()=> v.play().catch(()=>{}));
      v.addEventListener('ended', ()=> overlay.remove(), { once:true });
      v.addEventListener('error', ()=> swapToImage());
      overlay.appendChild(v);
    } else {
      swapToImage();
    }

    function swapToImage(){
      if (played) return;
      played = true;
      overlay.innerHTML = `<img src="${urlImg}" alt="${name}" />`;
    }

    document.body.appendChild(overlay);
    if (autohide>0) setTimeout(()=> overlay.remove(), autohide);
  }

  // 🪄 Level setup
  function beginLevel(level){
    state.level = level;
    state.qIndex = 0;
    state.correctInRow = 0;
    els.levelLabel.textContent = `Level ${level}`;
    setTheme(level);

    if (level === 1) showPoster('poster-countdown', {autohide:1600});
    if (level > 1) try { sfx.levelUp.play(); showPoster('poster-levelup', {autohide:1600}); } catch {}
  }

  function setTheme(level){
    document.body.classList.remove('theme-level1','theme-level2','theme-level3');
    document.body.classList.add(`theme-level${level}`);
  }

  function updateHeader(){
    const streak = getStreak();
    els.streakLabel.textContent = `🔥 Streak: ${streak}`;
    els.progressLabel.textContent = `Q ${state.qIndex+1}/12`;
    if (els.qTimerBar) els.qTimerBar.style.width = `${Math.floor((state.qIndex/12)*100)}%`;
  }

  // 🎯 Question loop
  function paintQuestion(){
    const subset = state.currentSet.filter(q=> q.Level===state.level);
    const q = subset[state.qIndex];
    if (!q) return levelComplete();

    els.questionBox.textContent = q.Question;
    els.choices.innerHTML = '';

    q.Answers.forEach((t,idx)=>{
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = t;
      b.addEventListener('click', ()=> onAnswer(idx===0, q));
      els.choices.appendChild(b);
    });

    updateHeader();
  }

  function onAnswer(isCorrect, q){
    state.totalAsked++;
    if (isCorrect){
      state.totalCorrect++;
      state.correctInRow++;
      try{sfx.correct.play();}catch{}
      blink(true);
      if (state.correctInRow>=3 && state.wrongCount>0){
        state.wrongCount--;
        // Redemption: remove one wrong answer
        showPoster('poster-reward', {autohide:1500});
      }
      if (window.WhyleeAchievements) window.WhyleeAchievements.addXP(10);
    } else {
      state.correctInRow = 0;
      state.wrongCount++;
      try{sfx.wrong.play();}catch{}
      blink(false);
    }

    state.qIndex++;
    setTimeout(paintQuestion, 320);
  }

  function blink(ok){
    els.choices.classList.remove('blink-ok','blink-bad');
    void els.choices.offsetWidth;
    els.choices.classList.add(ok?'blink-ok':'blink-bad');
    setTimeout(()=> els.choices.classList.remove('blink-ok','blink-bad'), 260);
  }

  function levelComplete(){
    const perfect = (state.correctInRow >= 12);
    if (perfect) showPoster('poster-perfect', {autohide:1600});

    if (state.level < 3){
      beginLevel(state.level+1);
      paintQuestion();
    } else {
      endSession();
    }
  }

  function endSession(){
    state.running = false;
    markTodayComplete();

    if (state.totalCorrect >= 24){
      showPoster('poster-success', {autohide:1800});
    } else {
      showPoster('poster-night', {autohide:1800});
    }

    try{sfx.gameOver.play();}catch{}
    if (window.WhyleeReflections) window.WhyleeReflections.showCard({});
  }

  // 🚀 Game start
  async function start(rootEl){
    if (!rootEl) return;
    state.running = true;
    state.startedAt = Date.now();
    elapsedTick();

    try{
      state.currentSet = await window.WhyleeQuestions.load();
    } catch(e){
      console.warn('Failed to load questions', e);
      state.currentSet = [];
    }

    showPoster('poster-start', {autohide:1200});
    try{sfx.start.play();}catch{}
    beginLevel(1);
    paintQuestion();
  }

  window.WhyleeGame = { start };
})();
