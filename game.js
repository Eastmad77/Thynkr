/* Whylee — core game glue (v6004)
   Levels: 1 warm-up, 2 pairs, 3 trivia
   - 12 Q per level (36 total)
   - 3-in-a-row redemption removes one wrong
   - Daily streak tracked (>=1 level clears)
   - Posters & reflections at milestones
*/

(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // UI elements created by shell route '#/play'
  function cachePlayEls(){
    return {
      root: $('#quizRoot'),
      levelLabel: $('#levelLabel'),
      streakLabel: $('#streakLabel'),
      progressLabel: $('#progressLabel'),
      questionBox: $('#questionBox'),
      choices: $('#choices'),
      qTimerBar: $('#qTimerBar'),
      elapsed: $('#elapsedTime'),
      badgeBox: $('#badgeBox'),
    };
  }

  // Sounds (optional; ignore if missing)
  const sfx = {
    correct: new Audio('/media/audio/correct.mp3'),
    wrong: new Audio('/media/audio/wrong.mp3'),
    levelUp: new Audio('/media/audio/level-up.mp3'),
    start: new Audio('/media/audio/start-chime.mp3'),
    gameOver: new Audio('/media/audio/game-over-low.mp3')
  };
  Object.values(sfx).forEach(a=> a && (a.volume = 0.6));

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
    const s = Math.floor(ms/1000), m = Math.floor(s/60), r = s%60;
    return `${m}:${r<10?'0':''}${r}`;
  }

  // Daily streak tracking
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
    // Achievements hook
    if (window.WhyleeAchievements) window.WhyleeAchievements.maybeAwardStreak(streak);
  }

  // Posters (image or video for Pro)
  function showPoster(name, {autohide=0}={}){
    const urlImg = `/media/posters/${name}.jpg`;
    const urlVid = `/media/posters/${name}.mp4`;
    const overlay = document.createElement('div');
    overlay.className = 'overlay-poster';
    // Pro tries video first
    if (window.WhyleePro?.isPro()){
      const v = document.createElement('video');
      Object.assign(v, { playsInline:true, muted:true, autoplay:true, src:urlVid });
      v.addEventListener('error', ()=> swapToImage());
      v.addEventListener('ended', ()=> overlay.remove(), { once:true });
      overlay.appendChild(v);
    } else {
      swapToImage();
    }
    function swapToImage(){
      overlay.innerHTML = `<img src="${urlImg}" alt="" />`;
    }
    document.body.appendChild(overlay);
    if (autohide>0) setTimeout(()=> overlay.remove(), autohide);
  }

  function setThemeForLevel(level){
    document.body.classList.remove('theme-level1','theme-level2','theme-level3');
    document.body.classList.add(`theme-level${level}`);
    const hero = $('#heroPoster');
    if (hero){
      hero.src = {
        1:'/media/posters/poster-start.jpg',
        2:'/media/posters/poster-level2.jpg',
        3:'/media/posters/poster-level3.jpg'
      }[level] || '/media/posters/poster-start.jpg';
    }
  }

  function updateHeader(){
    const els = cachePlayEls();
    if (!els.root) return;
    const pct = Math.min(100, Math.floor((state.totalAsked/36)*100));
    els.qTimerBar && (els.qTimerBar.style.width = Math.floor((state.qIndex/12)*100)+'%');
    const streak = getStreak();
    els.levelLabel.textContent = `Level ${state.level}`;
    els.streakLabel.textContent = `Streak: ${streak} • XP: ${window.WhyleeAchievements?.xp()||0}`;
  }

  function elapsedTick(){
    const els = cachePlayEls();
    if (!state.running || !els.elapsed) return;
    els.elapsed.textContent = fmtTime(Date.now()-state.startedAt);
    state.timerHandle = setTimeout(elapsedTick, 250);
  }

  function beginLevel(level){
    state.level = level;
    state.qIndex = 0;
    state.correctInRow = 0;
    state.levelCounts[level] = 0;
    state.levelCorrects[level] = 0;
    setThemeForLevel(level);
    updateHeader();
    // posters
    if (level===1) showPoster('poster-countdown', {autohide:1600});
    if (level>1) try{ sfx.levelUp.play().catch(()=>{});}catch{}
  }

  function paintQuestion(){
    const els = cachePlayEls();
    const lv = state.level;
    const subset = state.currentSet.filter(q=> q.Level===lv);
    const q = subset[state.qIndex] || null;
    if (!q){
      // Level done
      const perfect = (state.levelCounts[lv]===12 && state.levelCorrects[lv]===12);
      if (perfect && window.WhyleeAchievements) window.WhyleeAchievements.maybeAwardPerfect(lv);
      if (perfect) showPoster('poster-success', {autohide:1500});

      if (lv<3){
        beginLevel(lv+1);
        paintQuestion();
        return;
      }
      // All done
      endSession();
      return;
    }

    els.progressLabel.textContent = `Q ${state.qIndex+1}/12`;
    els.questionBox.textContent = q.Question;
    els.choices.innerHTML = '';

    q.Answers.forEach((t,idx)=>{
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = t;
      b.addEventListener('click', ()=> onAnswer(idx===0, q));
      els.choices.appendChild(b);
    });
  }

  function onAnswer(isCorrect, q){
    const els = cachePlayEls();
    state.totalAsked++;
    state.levelCounts[state.level]++;

    if (isCorrect){
      state.totalCorrect++; state.levelCorrects[state.level]++;
      state.correctInRow++;
      try{ sfx.correct.play().catch(()=>{});}catch{}
      if (state.correctInRow>=3 && state.wrongCount>0) state.wrongCount = Math.max(0, state.wrongCount-1);
      blink(true);
      if (window.WhyleeAchievements) window.WhyleeAchievements.addXP(10);
    } else {
      state.correctInRow = 0;
      state.wrongCount++;
      try{ sfx.wrong.play().catch(()=>{});}catch{}
      blink(false);
    }

    updateHeader();
    state.qIndex++;
    setTimeout(paintQuestion, 320);

    function blink(ok){
      els.choices.classList.remove('blink-ok','blink-bad');
      void els.choices.offsetWidth; // reflow
      els.choices.classList.add(ok ? 'blink-ok':'blink-bad');
      setTimeout(()=> els.choices.classList.remove('blink-ok','blink-bad'), 260);
    }
  }

  function endSession(){
    state.running = false;
    clearTimeout(state.timerHandle);
    markTodayComplete();
    // Posters at end
    if (state.totalCorrect >= 24) showPoster('poster-success', {autohide:2000});
    else showPoster('poster-night', {autohide:2000});
    // Reflection card
    window.WhyleeReflections?.showCard({});
  }

  // Public start (called by shell when #/play route renders)
  async function start(rootEl){
    const els = cachePlayEls();
    if (!rootEl || !els.questionBox) return;
    state.startedAt = Date.now();
    state.running = true;
    elapsedTick();

    try {
      state.currentSet = await window.WhyleeQuestions.load();
    } catch {
      state.currentSet = [];
    }

    beginLevel(1);
    paintQuestion();
  }

  window.WhyleeGame = { start };
})();
