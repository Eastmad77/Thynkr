/* Thynkr — App (levels + premium streak bar + level-up splash)
   v9008
   - 3 Levels: 12 Qs each (total 36)
   - Redemption: L1 needs 3-in-a-row, L2 needs 4, L3 needs 5
   - Mistakes tracked as red "pips"; every full streak redeems 1 mistake
   - Level-up splash between levels (optional sound)
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

  // level splash
  const levelUpSplash = qs('#levelUpSplash');
  const levelUpTitle = qs('#levelUpTitle');
  const levelVideo = qs('#levelVideo');
  const sfxLevelUp = qs('#sfxLevelUp');

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

  // Streak/Redemption
  let currentStreak = 0;
  let mistakes = 0;

  // --- Load data (demo uses a baked-in CSV path; replace with your builder if needed)
  async function loadQuestions() {
    // Example: pull one CSV (already 36) — swap to your feed if different
    // Papa.parse if remote; here we assume a CSV path set elsewhere
    // For demo just set dummy if not present
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
    // Use inset-right to animate width
    const right = (1 - pct) * 100;
    streakFill.style.inset = `0 ${right}% 0 0`;
    streakFill.classList.toggle('glow', currentStreak >= required-1 && currentStreak > 0);
    streakLabel.textContent = `Streak ${currentStreak}/${required}`;

    mistakesLabel.textContent = `Mistakes ${mistakes}`;
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
    // animate last pip
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
      // redemption
      redeemOneMistake();
      currentStreak = 0; // reset for next redemption cycle
    }
    renderStreakUI();
  }

  function onWrong() {
    mistakes++;
    currentStreak = 0;
    animateShake();
    renderStreakUI();
  }

  // --- Level transitions
  function showLevelUp(nextLevel) {
    // text
    levelUpTitle.textContent = nextLevel === 3 ? 'Level 3 Unlocked' : 'Level 2 Unlocked';
    levelUpSplash.classList.remove('hidden');
    // play media
    try { levelVideo.currentTime = 0; levelVideo.play().catch(()=>{}); } catch(e){}
    try { sfxLevelUp && sfxLevelUp.play().catch(()=>{}); } catch(e){}
    requestAnimationFrame(()=> levelUpSplash.classList.add('show'));
    // after 1.8s, hide
    setTimeout(()=>{
      levelUpSplash.classList.remove('show');
      setTimeout(()=>levelUpSplash.classList.add('hidden'), 360);
    }, 1800);
  }

  function gotoNextLevel() {
    if (level >= 3) return; // finished all
    level++;
    levelIndexStart = (level-1) * LVL_SIZE;
    // reset streak visuals (mistakes persist; that’s the point)
    currentStreak = 0;
    renderStreakUI();
    showLevelUp(level);
  }

  // --- Quiz engine (minimal; plug into your existing question rendering)
  function showQuestion() {
    const q = questions[idx];
    if (!q) { // guard
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
    // score
    if (correct) {
      score++;
      onCorrect();
    } else {
      onWrong();
    }

    // progress
    idx++;
    updateHeader();

    // end-of-level gate
    if (idx === levelIndexStart + LVL_SIZE) {
      if (level < 3) gotoNextLevel();
    }

    // end-of-game
    if (idx >= 36) {
      finishGame();
    } else {
      showQuestion();
    }
  }

  function finishGame() {
    const gameOverBox = qs('#gameOverBox');
    const gameOverText = qs('#gameOverText');
    const playAgainBtn = qs('#playAgainBtn');

    gameOverText.textContent = `Done! Score ${score} / 36. Mistakes cleared: ${Math.max(0, mistakes)}`;
    playAgainBtn.style.display = '';
    gameOverBox.style.display = '';

    playAgainBtn.onclick = () => window.location.reload();
  }

  // --- Boot / Controls
  startBtn?.addEventListener('click', async () => {
    await loadQuestions();
    // You will likely load CSV with Papa.parse → set `questions` (array of 36 objects)
    // Below is a placeholder to avoid empty UI if CSV not wired yet:
    if (!questions.length) {
      // Dummy demo of 36 identical shells — replace with your parsed CSV rows
      for (let i=0;i<36;i++){
        questions.push({
          Question:`Sample question ${i+1}`,
          OptionA:'A', OptionB:'B', OptionC:'C', OptionD:'D',
          Answer:'A'
        });
      }
    }
    // Reset for level 1
    level = 1;
    levelIndexStart = 0;
    idx = 0; score = 0; mistakes = 0; currentStreak = 0;
    setLabel.textContent = 'Live';
    renderStreakUI();
    showQuestion();
  });

  shuffleBtn?.addEventListener('click', () => {
    // Keep simple: randomize order of the 36 questions
    for (let i=questions.length-1; i>0; i--){
      const j = Math.floor(Math.random()*(i+1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    idx = 0; level = 1; levelIndexStart = 0; score = 0; mistakes = 0; currentStreak = 0;
    renderStreakUI();
    showQuestion();
  });

  shareBtn?.addEventListener('click', async () => {
    const text = `I’m playing Thynkr — score ${score}/36!`;
    try {
      if (navigator.share) await navigator.share({ text });
      else navigator.clipboard.writeText(text);
    } catch(e){}
  });

  // initial UI
  updateHeader();
  renderStreakUI();
})();
