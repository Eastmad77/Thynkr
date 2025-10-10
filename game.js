/* Whylee Core Game v6004 — Levels, XP, Badges, Reflection */
(() => {
  const $ = s => document.querySelector(s);

  const state = {
    level: 1, idxInLevel: 0, set: [],
    totalAsked: 0, totalCorrect: 0, correctInRow: 0, wrong: 0,
    levelCounts: {1:0,2:0,3:0}, levelCorrects: {1:0,2:0,3:0},
    running: false, startedAt: 0, timer: null,
    xp: Number(localStorage.getItem('wl_xp')||0),
    badges: JSON.parse(localStorage.getItem('wl_badges')||'[]')
  };

  const el = { screen:null,q:null,choices:null,progress:null,time:null,bar:null, levelTitle:null,streakText:null,badgeBox:null };

  const dayKey = () => new Date().toISOString().slice(0,10);
  function getStreak(){ return Number(localStorage.getItem('wl_streak')||0); }
  function markTodayDone(){
    const today = dayKey(); const last = localStorage.getItem('wl_last_date'); let s = getStreak();
    if (last !== today){ if (last){ const y = new Date(last); y.setDate(y.getDate()+1); s = (y.toISOString().slice(0,10)===today) ? s+1 : 1; } else s=1;
      localStorage.setItem('wl_streak', String(s)); localStorage.setItem('wl_last_date', today); }
  }

  function fmtTime(ms){ const s=Math.floor(ms/1000), m=Math.floor(s/60), r=s%60; return `${m}:${r<10?'0':''}${r}`; }
  function vibrate(ms){ if (navigator.vibrate) try{navigator.vibrate(ms);}catch{} }
  function setThemeForLevel(lv){ document.body.classList.remove('theme-level1','theme-level2','theme-level3'); document.body.classList.add(`theme-level${lv}`); }

  function addXP(n){ state.xp+=n; localStorage.setItem('wl_xp', String(state.xp)); }
  function applyBadges(){
    const snapshot = {
      streak: getStreak(),
      l1: state.levelCorrects[1], l2: state.levelCorrects[2], l3: state.levelCorrects[3],
      total: state.totalAsked,
      acc: state.totalAsked ? (state.totalCorrect/state.totalAsked) : 0
    };
    state.badges = window.WhyleeAchievements.evaluate(state.badges, snapshot);
    localStorage.setItem('wl_badges', JSON.stringify(state.badges));
    paintBadges();
  }

  function paintHeader(){
    el.levelTitle.textContent = `Level ${state.level}`;
    el.streakText.textContent = `Streak: ${getStreak()} • XP: ${state.xp}`;
  }
  function paintBadges(){
    if (!el.badgeBox) return;
    const list = window.WhyleeAchievements.pretty(state.badges);
    el.badgeBox.innerHTML = list.length
      ? list.map(b=>`<span class="badge"><span class="i">${b.icon}</span>${b.label}</span>`).join('')
      : '<span class="muted">No badges yet</span>';
  }
  function paintProgress(){ el.progress.textContent = `Q ${state.idxInLevel+1}/12`; }

  function paintQuestion(q){
    el.q.textContent = q.Question;
    el.choices.innerHTML = '';
    q.Answers.forEach((t,i)=>{
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = t;
      b.addEventListener('click', ()=> onAnswer(i === q.CorrectIndex));
      el.choices.appendChild(b);
    });
    qTimerStart();
  }

  function qTimerStart(){
    const start = performance.now(); const dur = 10000;
    el.bar.style.width='0%';
    function step(ts){ if (!state.running) return;
      const p = Math.min(1,(ts-start)/dur); el.bar.style.width=(p*100)+'%'; if (p<1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  function nextQuestion(){
    const lvlQs = state.set.filter(q=>q.Level===state.level);
    const q = lvlQs[state.idxInLevel];
    if (!q){ // level end
      const perfect = state.levelCorrects[state.level] === 12;
      if (perfect) addXP(25);
      applyBadges();
      if (state.level < 3){
        state.level += 1; state.idxInLevel = 0; setThemeForLevel(state.level); paintHeader();
        showPoster(`/media/posters/poster-level${state.level}.jpg`, 1500, () => nextQuestion());
        return;
      }
      // session end
      addXP(50);
      markTodayDone(); applyBadges();
      const wisdom = window.WhyleeReflections.getTodayReflection();
      showPoster('/media/posters/poster-success.jpg', 1200, ()=> {
        showReflection(wisdom, ()=> showPoster('/media/posters/poster-tomorrow.jpg', 1500, ()=> goHome()));
      });
      state.running = false; return;
    }
    paintProgress(); paintQuestion(q);
  }

  function onAnswer(ok){
    state.totalAsked++; state.levelCounts[state.level]++;
    if (ok){ state.totalCorrect++; state.levelCorrects[state.level]++; state.correctInRow++; addXP(2);
      if (state.correctInRow>=3 && state.wrong>0) state.wrong--; flash(true);
    } else { state.correctInRow=0; state.wrong++; vibrate(40); flash(false); }
    el.time.textContent = fmtTime(Date.now()-state.startedAt);
    state.idxInLevel++; setTimeout(nextQuestion, 320);
  }
  function flash(ok){ el.choices.classList.remove('blink-ok','blink-bad'); void el.choices.offsetWidth; el.choices.classList.add(ok?'blink-ok':'blink-bad'); setTimeout(()=> el.choices.classList.remove('blink-ok','blink-bad'),260); }
  function goHome(){ location.hash = '#/home'; }
  function showPoster(src,ms=1200,cb){ const o=document.createElement('div'); o.className='overlay-poster'; o.innerHTML=`<img src="${src}" alt="">`; document.body.appendChild(o); setTimeout(()=>{o.remove(); cb&&cb();},ms); }

  function showReflection(text, done){
    const box = document.createElement('div');
    box.className = 'reflection';
    box.innerHTML = `
      <div class="reflection-card">
        <div class="fox"><img src="/media/icons/whylee-fox.svg" alt="" width="56" height="56"/></div>
        <h3>Whylee’s Wisdom</h3>
        <p>${text}</p>
        <button class="primary" id="ref-continue">Continue</button>
      </div>`;
    document.body.appendChild(box);
    document.getElementById('ref-continue').addEventListener('click', ()=>{ box.remove(); done && done(); }, { once:true });
  }

  async function start(elRoot){
    el.screen = elRoot;
    el.q = elRoot.querySelector('#questionBox'); el.choices = elRoot.querySelector('#choices');
    el.progress = elRoot.querySelector('#progressLabel'); el.time = elRoot.querySelector('#elapsedTime');
    el.bar = elRoot.querySelector('#qTimerBar'); el.levelTitle = elRoot.querySelector('#levelLabel');
    el.streakText = elRoot.querySelector('#streakLabel'); el.badgeBox = elRoot.querySelector('#badgeBox');

    setThemeForLevel(1); paintHeader(); paintBadges();

    state.set = await window.WhyleeQuestions.getTodaysSet();
    state.level = 1; state.idxInLevel = 0; state.totalAsked = 0; state.totalCorrect = 0;
    state.correctInRow = 0; state.wrong = 0; state.levelCounts = {1:0,2:0,3:0}; state.levelCorrects = {1:0,2:0,3:0};
    state.running = true; state.startedAt = Date.now();
    tickElapsed();

    showPoster('/media/posters/poster-countdown.jpg', 1100, ()=> nextQuestion());
  }

  function tickElapsed(){ if (!state.running) return; el.time.textContent = fmtTime(Date.now()-state.startedAt); state.timer = setTimeout(tickElapsed, 250); }

  window.WhyleeGame = { start };
})();
