/* Thynkr — v9030 (guards for null nodes + tap-to-begin splash) */

(() => {
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => [...r.querySelectorAll(s)];

  const questionBox = qs('#questionBox');
  const choicesBox = qs('#choices');
  const startBtn = qs('#startBtn');
  const shuffleBtn = qs('#shuffleBtn');
  const shareBtn = qs('#shareBtn');

  const progressLabel = qs('#progressLabel');
  const pillScore = qs('#pillScore');
  const setLabel = qs('#setLabel');

  const streakBar = qs('#streakBar');
  const streakFill = qs('#streakFill');
  const streakPips = qs('#streakPips');
  const streakLabel = qs('#streakLabel');
  const mistakesLabel = qs('#mistakesLabel');

  const levelUpSplash = qs('#levelUpSplash');
  const levelUpTitle = qs('#levelUpTitle');
  const levelVideo = qs('#levelVideo');
  const sfxLevelUp = qs('#sfxLevelUp');
  const levelUpAvatar = qs('#levelUpAvatar');

  const failSplash = qs('#failSplash');
  const failVideo = qs('#failVideo');
  const sfxFail = qs('#sfxFail');
  const failAvatar = qs('#failAvatar');

  const avatarImg = qs('#avatarHero');

  const AVATARS = {
    core:     '/media/avatars/thynkr-fox-core.png',
    curious:  '/media/avatars/thynkr-fox-curious.png',
    focused:  '/media/avatars/thynkr-fox-focused.png',
    genius:   '/media/avatars/thynkr-fox-genius.png',
    playful:  '/media/avatars/thynkr-fox-playful.png',
    night:    '/media/avatars/thynkr-fox-night.png',
    relaxed:  '/media/avatars/thynkr-fox-relaxed.png',
    gameover: '/media/avatars/thynkr-fox-gameover.png',
  };
  Object.values(AVATARS).forEach(src => { const i = new Image(); i.src = src; });

  let questions = [];
  let idx = 0;
  let score = 0;
  const LVL_SIZE = 12;
  const REQUIRED_BY_LEVEL = {1:3,2:4,3:5};
  let level = 1;
  let levelIndexStart = 0;
  let currentStreak = 0;
  let mistakes = 0;
  const MAX_LIVES = 3;
  let gameOver = false;

  // Tap-to-begin splash
  (function setupStartSplash(){
    const splash = document.getElementById('startSplash');
    if (!splash) return;
    const hideSplash = () => { splash.classList.add('splash-hide'); setTimeout(()=>splash.remove(), 450); };
    splash.addEventListener('click', () => { hideSplash(); startBtn?.click(); }, { passive:true });
  })();

  function updateHeader() {
    if (pillScore)     pillScore.textContent = `Score ${score}`;
    if (progressLabel) progressLabel.textContent = `Q ${idx}/36`;
  }

  function setAvatar(key, effect = '') {
    if (!avatarImg) return;
    const src = AVATARS[key] || AVATARS.core;
    if (avatarImg.src.endsWith(src)) return;
    avatarImg.style.opacity = '0';
    setTimeout(() => { avatarImg.src = src; avatarImg.style.opacity = '1'; }, 160);
  }

  function renderStreakUI() {
    const required = REQUIRED_BY_LEVEL[level];
    const pct = Math.max(0, Math.min(1, currentStreak / required));
    const right = (1 - pct) * 100;
    if (streakFill) {
      streakFill.style.inset = `0 ${right}% 0 0`;
      streakFill.classList.toggle('glow', currentStreak >= required-1 && currentStreak > 0);
    }
    if (streakLabel) streakLabel.textContent = `Streak ${currentStreak}/${required}`;
    if (mistakesLabel) mistakesLabel.textContent = `Mistakes ${Math.min(mistakes, MAX_LIVES)}/${MAX_LIVES}`;

    if (streakPips) {
      streakPips.innerHTML = '';
      const maxShow = Math.min(mistakes, 6);
      for (let i=0;i<maxShow;i++){
        const d = document.createElement('div'); d.className = 'streak-pip'; streakPips.appendChild(d);
      }
      if (mistakes > 6) {
        const more = document.createElement('div');
        more.className = 'streak-pip';
        more.style.width = 'auto';
        more.style.padding = '0 6px';
        more.style.background = 'transparent';
        more.style.border = '1px solid rgba(255,255,255,.25)';
        more.style.color = 'var(--muted)';
        more.style.fontSize = '10px';
        more.textContent = `+${mistakes-6}`;
        streakPips.appendChild(more);
      }
    }
  }

  function animateShake(){ if (streakBar) { streakBar.classList.add('shake'); setTimeout(()=>streakBar.classList.remove('shake'), 160); } }

  function redeemOneMistake() {
    if (mistakes <= 0) return;
    const pips = qsa('.streak-pip', streakPips || document);
    const last = pips[pips.length-1];
    if (last) {
      last.classList.add('remove');
      setTimeout(() => { mistakes--; renderStreakUI(); }, 360);
    } else { mistakes--; renderStreakUI(); }
  }

  function onCorrect() {
    const required = REQUIRED_BY_LEVEL[level];
    currentStreak++;
    if (currentStreak >= required) { redeemOneMistake(); currentStreak = 0; }
    renderStreakUI();
  }

  function triggerGameOver() {
    gameOver = true;
    setAvatar('gameover');
    const fail = document.getElementById('failSplash');
    const failV = document.getElementById('failVideo');
    if (fail) {
      fail.classList.remove('hidden');
      try { failV.currentTime = 0; failV.play().catch(()=>{}); } catch(e){}
      requestAnimationFrame(()=> fail.classList.add('show'));
      setTimeout(()=>{ fail.classList.remove('show'); setTimeout(()=>fail.classList.add('hidden'), 360); finishGame(true); }, 1600);
    } else {
      finishGame(true);
    }
  }

  function onWrong() {
    mistakes++; currentStreak = 0; animateShake(); setAvatar('core'); renderStreakUI();
    if (mistakes >= MAX_LIVES && !gameOver) triggerGameOver();
  }

  async function loadQuestions() {
    if (!questions.length) {
      // placeholder 36 Qs
      for (let i=0;i<36;i++){
        questions.push({
          Question:`Sample question ${i+1}`,
          OptionA:'Option A', OptionB:'Option B', OptionC:'Option C', OptionD:'Option D',
          Answer:'Option A'
        });
      }
    }
  }

  function showQuestion() {
    if (gameOver) return;
    const q = questions[idx];
    if (!q) { if (questionBox) questionBox.textContent = 'No question loaded.'; if (choicesBox) choicesBox.innerHTML = ''; return; }
    if (questionBox) questionBox.textContent = q.Question;
    if (choicesBox) {
      choicesBox.innerHTML = '';
      [q.OptionA, q.OptionB, q.OptionC, q.OptionD].forEach(opt => {
        const b = document.createElement('button');
        b.className = 'btn'; b.textContent = opt;
        b.addEventListener('click', () => handleAnswer(opt === q.Answer));
        choicesBox.appendChild(b);
      });
    }
    updateHeader();
  }

  function handleAnswer(correct) {
    if (gameOver) return;
    if (correct) { score++; onCorrect(); } else { onWrong(); if (gameOver) return; }
    idx++; updateHeader();
    if (!gameOver && idx === levelIndexStart + LVL_SIZE) {
      if (level < 3) gotoNextLevel();
    }
    if (!gameOver && idx >= 36) finishGame(false);
    else if (!gameOver) showQuestion();
  }

  function showLevelUp(nextLevel) {
    const splash = levelUpSplash;
    if (!splash) return;
    if (levelUpTitle) levelUpTitle.textContent = nextLevel === 3 ? 'Level 3 Unlocked' : 'Level 2 Unlocked';
    splash.classList.remove('hidden');
    try { levelVideo.currentTime = 0; levelVideo.play().catch(()=>{}); } catch(e){}
    requestAnimationFrame(()=> splash.classList.add('show'));
    setTimeout(()=>{ splash.classList.remove('show'); setTimeout(()=>splash.classList.add('hidden'), 360); }, 1800);
  }

  function gotoNextLevel() {
    if (level >= 3) return;
    level++; levelIndexStart = (level-1)*LVL_SIZE; currentStreak=0; renderStreakUI(); setAvatar(level===3?'night':'relaxed');
    showLevelUp(level);
  }

  function finishGame(fromFail) {
    const box = qs('#gameOverBox');
    const txt = qs('#gameOverText');
    const btn = qs('#playAgainBtn');
    if (txt) txt.textContent = fromFail ? `Game Over — out of lives. Score ${score} / ${idx}.` : `Done! Score ${score} / 36.`;
    if (btn) { btn.style.display=''; btn.onclick = () => window.location.reload(); }
    if (box) box.style.display = '';
  }

  startBtn?.addEventListener('click', async () => {
    await loadQuestions();
    idx=0; score=0; mistakes=0; currentStreak=0; gameOver=false; level=1; levelIndexStart=0;
    if (setLabel) setLabel.textContent = 'Live';
    setAvatar('focused'); renderStreakUI(); showQuestion();
  });

  shuffleBtn?.addEventListener('click', () => {
    for (let i=questions.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    idx=0; score=0; mistakes=0; currentStreak=0; gameOver=false; level=1; levelIndexStart=0;
    setAvatar('core'); renderStreakUI(); showQuestion();
  });

  shareBtn?.addEventListener('click', async () => {
    const text = `I’m playing Thynkr — score ${score}/${Math.min(idx,36)}!`;
    try { if (navigator.share) await navigator.share({ text }); else navigator.clipboard.writeText(text); } catch(e){}
  });

  updateHeader();
  renderStreakUI();
  setAvatar('core');
})();
