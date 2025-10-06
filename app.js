/* Thynkr — App (levels + premium streak bar + level-up + game-over splash)
   v9010
   - 3 Levels: 12 Qs each (total 36)
   - Redemption: L1=3, L2=4, L3=5
   - Lives: 3 total (game ends when mistakes >= lives)
*/

(() => {
  // --- DOM
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

  const failSplash = qs('#failSplash');
  const failVideo = qs('#failVideo');
  const sfxFail = qs('#sfxFail');

  // timers (stubs)
  const timerBar = qs('#timerBar');
  const qTimerBar = qs('#qTimerBar');
  const elapsedTime = qs('#elapsedTime');

  // --- State
  let questions = [];      // loaded set of 36
  let idx = 0;             // 0..35
  let score = 0;

  // Levels
  const LVL_SIZE = 12;
  const REQUIRED_BY_LEVEL = { 1:3, 2:4, 3:5 };

  let level = 1;           // 1..3
  let levelIndexStart = 0; // pointer into 0..35 for the current level

  // Streak/Redemption/Lives
  let currentStreak = 0;
  let mistakes = 0;
  const MAX_LIVES = 3;
  let gameOver = false;

  // --- Load data (plug in your CSV fetch here)
  async function loadQuestions() {
    // TODO: Replace with Papa.parse of your chosen CSV (36 rows)
    if (!questions.length) {
      questionBox.textContent = 'Ready — press Start';
    }
  }

  function updateHeader() {
    pillScore.textContent = `Score ${score}`;
    progressLabel.textContent = `Q ${idx}/${36}`;
  }

  // --- Streak UI helpers
  function renderStreakUI() {
    const required = REQUIRED_BY_LEVEL[level];
    const pct = Math.max(0, Math.min(1, currentStreak / required));
    const right = (1 - pct) * 100;
    streakFill.style.inset = `0 ${right}% 0 0`;
    streakFill.classList.toggle('glow', currentStreak >= required-1 && currentStreak > 0);
    streakLabel.textContent = `Streak ${currentStreak}/${required}`;

    mistakesLabel.textContent = `Mistakes ${Math.min(mistakes, MAX_LIVES)}/${MAX_LIVES}`;
    // render pips
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

  function onCorrect() {
    const required = REQUIRED_BY_LEVEL[level];
    currentStreak++;
    if (currentStreak >= required) {
      redeemOneMistake();
      currentStreak = 0; // reset after redemption
    }
    renderStreakUI();
  }

  function triggerGameOver() {
    gameOver = true;
    // Splash
    failSplash.classList.remove('hidden');
    try { failVideo.currentTime = 0; failVideo.play().catch(()=>{}); } catch(e){}
    try { sfxFail && sfxFail.play().catch(()=>{}); } catch(e){}
    requestAnimationFrame(()=> failSplash.classList.add('show'));
    // After 1.6s, show summary
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
    renderStreakUI();

    if (mistakes >= MAX_LIVES && !gameOver) {
      triggerGameOver();
    }
  }

  // --- Level transitions
  function showLevelUp(nextLevel) {
    levelUpTitle.textContent = nextLevel === 3 ? 'Level 3 Unlocked' : 'Level 2 Unlocked';
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
    if (level >= 3) return; // finished all
    level++;
    levelIndexStart = (level-1) * LVL_SIZE;
    currentStreak = 0;
    renderStreakUI();
    showLevelUp(level);
  }

  // --- Quiz engine (minimal)
  function showQuestion() {
    if (gameOver) return;
    const q = questions[idx];
    if (!q) {
      questionBox.textContent = 'No question loaded.';
      choicesBox.innerHTML = '';
      return;
    }

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
      if (gameOver) return; // already finished
    }

    // progress
    idx++;
    updateHeader();

    // end-of-level gate
    if (!gameOver && idx === levelIndexStart + LVL_SIZE) {
      if (level < 3) gotoNextLevel();
    }

    // end-of-game (completed all 36)
    if (!gameOver && idx >= 36) {
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
      gameOverText.textContent = `Game Over — out of lives. Score ${score} / ${idx}. Mistakes: ${mistakes}/${MAX_LIVES}`;
    } else {
      gameOverText.textContent = `Done! Score ${score} / 36. Mistakes cleared: ${Math.max(0, mistakes)}`;
    }
    playAgainBtn.style.display = '';
    gameOverBox.style.display = '';

    playAgainBtn.onclick = () => window.location.reload();
  }

  // --- Boot / Controls
  startBtn?.addEventListener('click', async () => {
    await loadQuestions();
    if (!questions.length) {
      for (let i=0;i<36;i++){
        questions.push({
          Question:`Sample question ${i+1}`,
          OptionA:'A', OptionB:'B', OptionC:'C', OptionD:'D',
          Answer:'A'
        });
      }
    }
    // Reset
    level = 1;
    levelIndexStart = 0;
    idx = 0; score = 0; mistakes = 0; currentStreak = 0; gameOver = false;
    setLabel.textContent = 'Live';
    renderStreakUI();
    showQuestion();
  });

  shuffleBtn?.addEventListener('click', () => {
    for (let i=questions.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    level = 1; levelIndexStart = 0; idx = 0; score = 0; mistakes = 0; currentStreak = 0; gameOver = false;
    renderStreakUI();
    showQuestion();
  });

  shareBtn?.addEventListener('click', async () => {
    const text = `I’m playing Thynkr — score ${score}/${Math.min(idx,36)}!`;
    try {
      if (navigator.share) await navigator.share({ text });
      else navigator.clipboard.writeText(text);
    } catch(e){}
  });

  // initial UI
  updateHeader();
  renderStreakUI();
})();
