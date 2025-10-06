/* Thynkr — App v9020
   - 3 Levels (12 Qs each = 36)
   - Redemption: L1=3, L2=4, L3=5
   - Lives: 3 (game over when exhausted)
   - Avatars: dynamic per game context + splash integration
*/

(() => {
  // --- DOM helpers
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Core nodes
  const questionBox   = qs('#questionBox');
  const choicesBox    = qs('#choices');
  const startBtn      = qs('#startBtn');
  const shuffleBtn    = qs('#shuffleBtn');
  const shareBtn      = qs('#shareBtn');
  const progressLabel = qs('#progressLabel');
  const pillScore     = qs('#pillScore');
  const setLabel      = qs('#setLabel');

  // Timers (visual only here)
  const timerBar   = qs('#timerBar');
  const qTimerBar  = qs('#qTimerBar');
  const elapsedEl  = qs('#elapsedTime');

  // Streak UI
  const streakBar  = qs('#streakBar');
  const streakFill = qs('#streakFill');
  const streakPips = qs('#streakPips');
  const streakLabel = qs('#streakLabel');
  const mistakesLabel = qs('#mistakesLabel');

  // Overlays
  const levelUpSplash = qs('#levelUpSplash');
  const levelUpTitle  = qs('#levelUpTitle');
  const levelVideo    = qs('#levelVideo');
  const sfxLevelUp    = qs('#sfxLevelUp');

  const failSplash = qs('#failSplash');
  const failVideo  = qs('#failVideo');
  const sfxFail    = qs('#sfxFail');

  // Avatar node
  const avatarImg = qs('#avatar');

  // --- State
  const LVL_SIZE = 12;
  const REQUIRED_BY_LEVEL = { 1:3, 2:4, 3:5 };
  const MAX_LIVES = 3;

  let questions = [];           // 36 rows expected
  let idx = 0;                  // 0..35
  let score = 0;
  let level = 1;                // 1..3
  let levelIndexStart = 0;

  let currentStreak = 0;
  let mistakes = 0;
  let gameOver = false;
  let startTime = 0;
  let elapsedTimer = null;

  // --- Avatars
  const AVATARS = {
    core:      '/media/avatars/thynkr-fox-core.png',
    curious:   '/media/avatars/thynkr-fox-curious.png',
    focused:   '/media/avatars/thynkr-fox-focused.png',
    genius:    '/media/avatars/thynkr-fox-genius.png',
    playful:   '/media/avatars/thynkr-fox-playful.png',
    night:     '/media/avatars/thynkr-fox-night.png',
    relaxed:   '/media/avatars/thynkr-fox-relaxed.png',
    gameover:  '/media/avatars/thynkr-fox-gameover.png',
  };

  function setAvatar(key, burst = false) {
    if (!avatarImg) return;
    const src = AVATARS[key] || AVATARS.core;
    // micro enter animation
    avatarImg.classList.remove('show','pop');
    avatarImg.classList.add('enter');
    avatarImg.src = src;
    requestAnimationFrame(() => {
      avatarImg.classList.remove('enter');
      avatarImg.classList.add('show');
      if (burst) {
        avatarImg.classList.add('pop');
        setTimeout(() => avatarImg.classList.remove('pop'), 380);
      }
    });
  }

  // --- Load questions (placeholder; wire your CSV here)
  async function loadQuestions() {
    // Example: fetch('/questions/thynkr-batch1.csv') with Papa.parse, then map to
    // {Question,OptionA,OptionB,OptionC,OptionD,Answer}
    // For now, if empty, create 36 placeholders.
    if (!questions.length) {
      for (let i=0;i<36;i++){
        questions.push({
          Question:`Sample question ${i+1}`,
          OptionA:'A', OptionB:'B', OptionC:'C', OptionD:'D',
          Answer:'A'
        });
      }
    }
  }

  // --- UI helpers
  function updateHeader() {
    pillScore.textContent = `Score ${score}`;
    progressLabel.textContent = `Q ${idx}/${36}`;
  }

  function formatElapsed(ms){
    const s = Math.floor(ms/1000);
    const m = Math.floor(s/60);
    const r = s%60;
    return `${m}:${String(r).padStart(2,'0')}`;
  }

  function startElapsed() {
    stopElapsed();
    startTime = Date.now();
    elapsedTimer = setInterval(()=>{
      const ms = Date.now() - startTime;
      elapsedEl.textContent = formatElapsed(ms);
    }, 250);
  }
  function stopElapsed() {
    if (elapsedTimer) clearInterval(elapsedTimer);
    elapsedTimer = null;
  }

  // --- Streak UI
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

  function animateShake() {
    streakBar.classList.add('shake');
    setTimeout(()=>streakBar.classList.remove('shake'), 160);
  }

  function redeemOneMistake() {
    if (mistakes <= 0) return;
    const pips = qsa('.streak-pip', streakPips);
    const last = pips[pips.length-1];
    if (last) {
      last.classList.add('remove');
      setTimeout(() => {
        mistakes--;
        renderStreakUI();
      }, 360);
    } else {
      mistakes--;
      renderStreakUI();
    }
  }

  // --- Answer handlers
  function onCorrect() {
    const required = REQUIRED_BY_LEVEL[level];
    currentStreak++;
    setAvatar(currentStreak >= required-1 ? 'genius' : 'playful', true);

    if (currentStreak >= required) {
      redeemOneMistake();       // redemption
      currentStreak = 0;        // reset after redemption
    }
    renderStreakUI();
  }

  function triggerGameOver() {
    gameOver = true;
    setAvatar('gameover');
    // Show splash
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
    setAvatar('curious');
    renderStreakUI();

    if (mistakes >= MAX_LIVES && !gameOver) {
      triggerGameOver();
    }
  }

  // --- Level transitions
  function showLevelUp(nextLevel) {
    levelUpTitle.textContent = nextLevel === 3 ? 'Level 3 Unlocked' : 'Level 2 Unlocked';
    setAvatar(nextLevel === 3 ? 'night' : 'relaxed', true);
    levelUpSplash.classList.remove('hidden');
    try { levelVideo.currentTime = 0; levelVideo.play().catch(()=>{}); } catch(e){}
    try { sfxLevelUp && sfxLevelUp.play().catch(()=>{}); } catch(e){}
    requestAnimationFrame(()=> levelUpSplash.classList.add('show'));
    setTimeout(()=>{
      levelUpSplash.classList.remove('show');
      setTimeout(()=>levelUpSplash.classList.add('hidden'), 360);
      // After level-up animation, return to focused mode
      setAvatar('focused');
    }, 1800);
  }

  function gotoNextLevel() {
    if (level >= 3) return;
    level++;
    levelIndexStart = (level-1) * LVL_SIZE;
    currentStreak = 0;
    renderStreakUI();
    showLevelUp(level);
  }

  // --- Quiz engine
  function showQuestion() {
    if (gameOver) return;

    const q = questions[idx];
    if (!q) {
      questionBox.textContent = 'No question loaded.';
      choicesBox.innerHTML = '';
      return;
    }

    setAvatar('focused'); // default while answering

    questionBox.textContent = q.Question;
    choicesBox.innerHTML = '';

    const opts = [q.OptionA, q.OptionB, q.OptionC, q.OptionD];
    opts.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        const correct = (opt === q.Answer);
        handleAnswer(correct, q);
      });
      choicesBox.appendChild(btn);
    });

    updateHeader();
  }

  function handleAnswer(correct, q) {
    if (gameOver) return;

    if (correct) {
      score++;
      onCorrect();
    } else {
      onWrong();
      if (gameOver) return;
    }

    // progress
    idx++;
    updateHeader();

    // end-of-level gates
    if (!gameOver && idx === levelIndexStart + LVL_SIZE) {
      if (level < 3) gotoNextLevel();
    }

    // all done
    if (!gameOver && idx >= 36) {
      finishGame(false);
    } else if (!gameOver) {
      showQuestion();
    }
  }

  function finishGame(fromFail) {
    stopElapsed();
    const gameOverBox = qs('#gameOverBox');
    const gameOverText = qs('#gameOverText');
    const playAgainBtn = qs('#playAgainBtn');

    if (fromFail) {
      gameOverText.textContent = `Game Over — out of lives. Score ${score} / ${idx}.`;
      setAvatar('gameover');
    } else {
      gameOverText.textContent = `Done! Score ${score} / 36.`;
      setAvatar('genius', true);
      // quick “success” splash you already have:
      const successSplash = qs('#successSplash');
      successSplash?.setAttribute('aria-hidden','false');
      successSplash?.classList.add('show');
      setTimeout(()=>successSplash?.classList.remove('show'), 1200);
    }
    playAgainBtn.style.display = '';
    gameOverBox.style.display = '';
    playAgainBtn.onclick = () => window.location.reload();
  }

  // --- Controls
  startBtn?.addEventListener('click', async () => {
    await loadQuestions();
    // Reset
    level = 1;
    levelIndexStart = 0;
    idx = 0; score = 0; mistakes = 0; currentStreak = 0; gameOver = false;
    renderStreakUI();
    setLabel.textContent = 'Live';
    setAvatar('focused');
    startElapsed();
    showQuestion();
  });

  shuffleBtn?.addEventListener('click', () => {
    for (let i=questions.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    level = 1; levelIndexStart = 0; idx = 0; score = 0; mistakes = 0; currentStreak = 0; gameOver = false;
    renderStreakUI();
    setAvatar('focused');
    startElapsed();
    showQuestion();
  });

  shareBtn?.addEventListener('click', async () => {
    const text = `I’m playing Thynkr — score ${score}/${Math.min(idx,36)}!`;
    try {
      if (navigator.share) await navigator.share({ text });
      else navigator.clipboard.writeText(text);
    } catch(e){}
  });

  // boot UI
  updateHeader();
  renderStreakUI();
  setAvatar('core');
})();
