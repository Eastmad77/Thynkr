/* Thynkr — App (Tap-to-begin splash + avatars + levels + premium streak bar)
   v9021
*/

(() => {
  // --- DOM helpers
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

  const questionBox = qs('#questionBox');
  const choicesBox = qs('#choices');
  const startBtn = qs('#startBtn');
  const shuffleBtn = qs('#shuffleBtn');
  const shareBtn = qs('#shareBtn');
  const progressLabel = qs('#progressLabel');
  const pillScore = qs('#pillScore');
  const setLabel = qs('#setLabel');

  // streak UI
  const streakBar = qs('#streakBar');
  const streakFill = qs('#streakFill');
  const streakPips = qs('#streakPips');
  const streakLabel = qs('#streakLabel');
  const mistakesLabel = qs('#mistakesLabel');

  // overlays
  const levelUpSplash = qs('#levelUpSplash');
  const levelUpTitle = qs('#levelUpTitle');
  const levelVideo = qs('#levelVideo');
  const sfxLevelUp = qs('#sfxLevelUp');
  const levelUpAvatar = qs('#levelUpAvatar');

  const failSplash = qs('#failSplash');
  const failVideo = qs('#failVideo');
  const sfxFail = qs('#sfxFail');
  const failAvatar = qs('#failAvatar');

  // avatar
  const avatarImg = qs('#avatarHero');

  // --- Avatars map
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

  // --- State
  let questions = [];
  let idx = 0;
  let score = 0;

  const LVL_SIZE = 12;
  const REQUIRED_BY_LEVEL = { 1:3, 2:4, 3:5 };

  let level = 1;
  let levelIndexStart = 0;

  let currentStreak = 0;
  let mistakes = 0;
  const MAX_LIVES = 3;
  let gameOver = false;

  // --- Start Splash control (Tap-to-begin)
  (function setupStartSplash(){
    const splash = document.getElementById('startSplash');
    if (!splash) return;

    const hideSplash = () => {
      splash.classList.add('splash-hide');
      setTimeout(() => splash.remove(), 450);
    };

    splash.addEventListener('click', () => {
      hideSplash();
      // Start immediately
      startBtn?.click();
    }, { passive: true });
  })();

  // --- Helpers
  function updateHeader() {
    pillScore.textContent = `Score ${score}`;
    progressLabel.textContent = `Q ${idx}/36`;
  }

  function setAvatar(key, effect = '') {
    if (!avatarImg) return;
    const src = AVATARS[key] || AVATARS.core;
    if (avatarImg.src.endsWith(src)) {
      if (effect) pulseAvatar(effect);
      return;
    }
    avatarImg.style.opacity = '0';
    setTimeout(() => {
      avatarImg.src = src;
      if (effect) pulseAvatar(effect);
      avatarImg.style.opacity = '1';
    }, 160);
  }

  function pulseAvatar(effectName) {
    const map = { pop:'avatar-pop', glow:'avatar-glow', night:'avatar-night', sad:'avatar-sad' };
    const cls = map[effectName];
    if (!cls) return;
    avatarImg.classList.add(cls);
    setTimeout(()=>avatarImg.classList.remove(cls), 550);
  }

  // streak UI
  function renderStreakUI() {
    const required = REQUIRED_BY_LEVEL[level];
    const pct = Math.max(0, Math.min(1, currentStreak / required));
    const right = (1 - pct) * 100;
    streakFill.style.inset = `0 ${right}% 0 0`;
    streakFill.classList.toggle('glow', currentStreak >= required-1 && currentStreak > 0);
    streakLabel.textContent = `Streak ${currentStreak}/${required}`;

    mistakesLabel.textContent = `Mistakes ${Math.min(mistakes, MAX_LIVES)}/${MAX_LIVES}`;
    streakPips.innerHTML = '';
    const maxShow = Math.min(mistakes, 6);
    for (let i=0;i<maxShow;i++){
      const d = document.createElement('div');
      d.className = 'streak-pip';
      streakPips.appendChild(d);
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

  function animateShake(){ streakBar.classList.add('shake'); setTimeout(()=>streakBar.classList.remove('shake'), 160); }

  function redeemOneMistake() {
    if (mistakes <= 0) return;
    const pips = qsa('.streak-pip', streakPips);
    const last = pips[pips.length-1];
    if (last) {
      last.classList.add('remove');
      setTimeout(() => { mistakes--; renderStreakUI(); }, 360);
    } else { mistakes--; renderStreakUI(); }
  }

  function onCorrect() {
    const required = REQUIRED_BY_LEVEL[level];
    currentStreak++;
    if (currentStreak >= required-1) setAvatar('genius','glow');
    else setAvatar('playful','pop');

    if (currentStreak >= required) {
      redeemOneMistake();
      currentStreak = 0;
    }
    renderStreakUI();
  }

  function triggerGameOver() {
    gameOver = true;
    setAvatar('gameover','sad');
    if (failAvatar) failAvatar.src = AVATARS.gameover;

    failSplash.classList.remove('hidden');
    try { failVideo.currentTime = 0; failVideo.play().catch(()=>{}); } catch(e){}
    try { sfxFail && sfxFail.play().catch(()=>{}); } catch(e){}
    requestAnimationFrame(()=> failSplash.classList.add('show'));

    setTimeout(() => {
      failSplash.classList.remove('show');
      setTimeout(()=>failSplash.classList.add('hidden'), 360);
      finishGame(true);
    }, 1600);
  }

  function onWrong() {
    mistakes++;
    currentStreak = 0;
    animateShake();
    setAvatar('core');
    renderStreakUI();
    if (mistakes >= MAX_LIVES && !gameOver) triggerGameOver();
  }

  function showLevelUp(nextLevel) {
    levelUpTitle.textContent = nextLevel === 3 ? 'Level 3 Unlocked' : 'Level 2 Unlocked';
    if (levelUpAvatar) levelUpAvatar.src = AVATARS.genius;
    levelUpSplash.classList.remove('hidden');
    try { levelVideo.currentTime = 0; levelVideo.play().catch(()=>{}); } catch(e){}
    try { sfxLevelUp && sfxLevelUp.play().catch(()=>{}); } catch(e){}
    requestAnimationFrame(()=> levelUpSplash.classList.add('show'));
    setTimeout(()=>{
      levelUpSplash.classList.remove('show');
      setTimeout(()=>levelUpSplash.classList.add('hidden'), 360);
    }, 1800);
  }

  function gotoNextLevel() {
    if (level >= 3) return;
    level++;
    levelIndexStart = (level-1) * LVL_SIZE;
    currentStreak = 0;
    renderStreakUI();
    setAvatar(level === 3 ? 'night' : 'relaxed', level === 3 ? 'night' : 'glow');
    showLevelUp(level);
  }

  // --- Questions (replace with your CSV fetch)
  async function loadQuestions() {
    if (!questions.length) {
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
    if (!q) { questionBox.textContent = 'No question loaded.'; choicesBox.innerHTML = ''; return; }

    const required = REQUIRED_BY_LEVEL[level];
    if (currentStreak === required - 1 && required > 1) setAvatar('curious','pop');
    else setAvatar('focused');

    questionBox.textContent = q.Question;
    choicesBox.innerHTML = '';
    const opts = [q.OptionA, q.OptionB, q.OptionC, q.OptionD];

    opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => handleAnswer(opt === q.Answer, q));
      choicesBox.appendChild(btn);
    });

    updateHeader();
  }

  function handleAnswer(correct) {
    if (gameOver) return;
    if (correct) { score++; onCorrect(); }
    else { onWrong(); if (gameOver) return; }

    idx++;
    updateHeader();

    if (!gameOver && idx === levelIndexStart + LVL_SIZE) {
      if (level < 3) gotoNextLevel();
    }
    if (!gameOver && idx >= 36) {
      setAvatar('playful','glow');
      finishGame(false);
    } else if (!gameOver) {
      showQuestion();
    }
  }

  function finishGame(fromFail) {
    const gameOverBox = qs('#gameOverBox');
    const gameOverText = qs('#gameOverText');
    const playAgainBtn = qs('#playAgainBtn');

    if (fromFail) {
      gameOverText.textContent = `Game Over — out of lives. Score ${score} / ${idx}.`;
      setAvatar('gameover','sad');
    } else {
      gameOverText.textContent = `Done! Score ${score} / 36.`;
      setAvatar('playful','glow');
    }
    playAgainBtn.style.display = '';
    gameOverBox.style.display = '';
    playAgainBtn.onclick = () => window.location.reload();
  }

  // --- Controls
  startBtn?.addEventListener('click', async () => {
    await loadQuestions();
    level = 1; levelIndexStart = 0;
    idx = 0; score = 0; mistakes = 0; currentStreak = 0; gameOver = false;
    setLabel.textContent = 'Live';
    setAvatar('focused');
    renderStreakUI();
    showQuestion();
  });

  shuffleBtn?.addEventListener('click', () => {
    for (let i=questions.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    level = 1; levelIndexStart = 0; idx = 0; score = 0; mistakes = 0; currentStreak = 0; gameOver = false;
    setAvatar('core');
    renderStreakUI();
    showQuestion();
  });

  shareBtn?.addEventListener('click', async () => {
    const text = `I’m playing Thynkr — score ${score}/${Math.min(idx,36)}!`;
    try { if (navigator.share) await navigator.share({ text }); else navigator.clipboard.writeText(text); } catch(e){}
  });

  // initial UI
  updateHeader();
  renderStreakUI();
  setAvatar('core');
})();
