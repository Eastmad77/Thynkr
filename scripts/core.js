// scripts/core.js — v7000 (merged with legacy posters/timer/reflection features)
import { loadQuestionsForToday } from './questions.js';
import { Achievements } from './achievements.js';

window.WhyleeGame = (function () {
  // -----------------------------
  // SFX
  // -----------------------------
  const sfx = {
    click: new Audio('/media/audio/click.mp3'),
    correct: new Audio('/media/audio/correct.mp3'),
    wrong: new Audio('/media/audio/wrong.mp3'),
    levelup: new Audio('/media/audio/levelup.mp3'),
    start: new Audio('/media/audio/start-chime.mp3'),
    gameOver: new Audio('/media/audio/game-over-low.mp3')
  };
  Object.values(sfx).forEach(a => a && (a.volume = 0.6));

  // -----------------------------
  // Posters (image overlay with optional auto-hide)
  // -----------------------------
  function showPoster(key, { autohide = 0 } = {}) {
    // Map logical keys to your poster files (v1 set)
    const map = {
      countdown: '01_intro_discovery.png',
      level2: '06_challenge_mode.png',
      level3: '08_level_up.png',
      success: '03_reward_xp.png',
      night: '10_brand_close.png'
    };

    const file = map[key] || map.countdown;
    const urlImg = `/media/posters/v1/${file}`;

    const overlay = document.createElement('div');
    overlay.className = 'overlay-poster';
    overlay.innerHTML = `<img src="${urlImg}" alt="" />`;
    Object.assign(overlay.style, {
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'grid', placeItems: 'center',
      background: 'rgba(0,0,0,0.85)'
    });
    const img = overlay.querySelector('img');
    Object.assign(img.style, {
      maxWidth: '92vw', maxHeight: '92vh', borderRadius: '16px', boxShadow: '0 12px 48px rgba(0,0,0,0.6)'
    });
    document.body.appendChild(overlay);
    if (autohide > 0) setTimeout(() => overlay.remove(), autohide);
    overlay.addEventListener('click', () => overlay.remove(), { once: true });
  }

  // -----------------------------
  // Daily completion marker (separate from in-session streak)
  // Keeps a day-level streak so finishing at least one level counts for the day
  // -----------------------------
  function markDayComplete() {
    const KEY_LAST = 'wl_last_date';
    const KEY_STREAK = 'wl_daystreak';
    const today = new Date().toISOString().slice(0, 10);
    const last = localStorage.getItem(KEY_LAST);
    let streak = Number(localStorage.getItem(KEY_STREAK) || '0');

    if (last === today) return; // already counted
    if (!last) streak = 1;
    else {
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      const expected = d.toISOString().slice(0, 10);
      streak = (expected === today) ? streak + 1 : 1;
    }
    localStorage.setItem(KEY_STREAK, String(streak));
    localStorage.setItem(KEY_LAST, today);
    // Emit event so UI could badge it if desired
    dispatchEvent(new CustomEvent('wl:day-complete', { detail: { streak } }));
  }

  // -----------------------------
  // Timer helpers (legacy feel)
  // -----------------------------
  let startedAt = 0;
  let timerHandle = null;

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r < 10 ? '0' : ''}${r}`;
  }
  function startElapsed() {
    startedAt = Date.now();
    stopElapsed();
    tick();
  }
  function stopElapsed() {
    if (timerHandle) {
      clearTimeout(timerHandle);
      timerHandle = null;
    }
  }
  function tick() {
    const hud = document.getElementById('wl-elapsed');
    if (hud) hud.textContent = fmtTime(Date.now() - startedAt);
    timerHandle = setTimeout(tick, 250);
  }

  // -----------------------------
  // State
  // -----------------------------
  let daily = null;
  let currentLevel = 0; // 0-based index into daily.levels
  let qIndex = 0;

  // -----------------------------
  // Rendering
  // -----------------------------
  function renderQuestion(q) {
    const app = document.getElementById('app');
    if (!app) return;

    const levelCount = daily.levels[currentLevel].items.length;
    const totalLevels = daily.levels.length;

    app.innerHTML = `
      <section class="route route--play">
        <header class="play-hud">
          <span id="wl-level">Level ${currentLevel + 1}/${totalLevels}</span>
          <span>Streak: ${Achievements.state.streak}</span>
          <span>XP: ${Achievements.state.xp}</span>
          <span id="wl-progress">Q ${qIndex + 1}/${levelCount}</span>
          <span id="wl-elapsed" class="muted">0:00</span>
        </header>
        <div class="question">${q.question}</div>
        <div id="wl-choices" class="choices">
          ${q.choices.map((c, i) => `<button class="choice" data-i="${i}">${c}</button>`).join('')}
        </div>
      </section>`;

    // Bind choices
    app.querySelectorAll('.choice').forEach(btn => {
      btn.addEventListener('click', () => onAnswer(parseInt(btn.dataset.i, 10)));
    });
  }

  function blink(ok) {
    const box = document.getElementById('wl-choices');
    if (!box) return;
    box.classList.remove('blink-ok', 'blink-bad');
    // reflow to restart animation
    void box.offsetWidth;
    box.classList.add(ok ? 'blink-ok' : 'blink-bad');
    setTimeout(() => box.classList.remove('blink-ok', 'blink-bad'), 260);
  }

  // -----------------------------
  // Flow
  // -----------------------------
  function onAnswer(i) {
    const q = daily.levels[currentLevel].items[qIndex];
    const correct = i === q.correctIndex;

    if (correct) {
      sfx.correct.play().catch(() => {});
      Achievements.awardXP(25);
      Achievements.addStreak(1);
      blink(true);
    } else {
      sfx.wrong.play().catch(() => {});
      Achievements.resetStreak();
      blink(false);
    }
    Achievements.checkBadges();

    qIndex++;
    const levelItems = daily.levels[currentLevel].items;
    if (qIndex < levelItems.length) {
      renderQuestion(levelItems[qIndex]);
      return;
    }

    // level complete → next
    sfx.levelup.play().catch(() => {});
    currentLevel++;
    qIndex = 0;

    if (currentLevel < daily.levels.length && daily.levels[currentLevel].items.length) {
      // flavor poster between levels (legacy feel)
      if (currentLevel === 1) showPoster('level2', { autohide: 1200 });
      if (currentLevel === 2) showPoster('level3', { autohide: 1200 });
      renderQuestion(daily.levels[currentLevel].items[qIndex]);
    } else {
      endSession();
    }
  }

  function endSession() {
    stopElapsed();
    // Day completion (separate day-streak from in-session streak)
    markDayComplete();

    // Poster based on performance
    const totalAsked = daily.levels.reduce((a, l) => a + l.items.length, 0);
    const approxCorrect = Achievements.state.xp / 25; // since +25 per correct in this loop
    const success = approxCorrect >= Math.max(1, Math.floor(totalAsked * 0.66));
    showPoster(success ? 'success' : 'night', { autohide: 1800 });

    // Reflection (if module present)
    window.WhyleeReflections?.showCard?.({ levelCount: daily.levels.length });

    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <section class="route route--end">
        <h2>Great session!</h2>
        <p>Session streak: ${Achievements.state.streak} · XP: ${Achievements.state.xp}</p>
        <button id="play-again" class="primary">Play Again</button>
      </section>`;
    document.getElementById('play-again')?.addEventListener('click', start);
  }

  // -----------------------------
  // Start
  // -----------------------------
  async function start() {
    try { sfx.start.play().catch(() => {}); } catch {}
    const app = document.getElementById('app');
    if (app) app.innerHTML = `<p class="muted">Loading today’s questions…</p>`;

    if (!daily) daily = await loadQuestionsForToday();
    currentLevel = 0; qIndex = 0;

    // show intro poster (legacy feel)
    showPoster('countdown', { autohide: 1000 });
    startElapsed();

    if (!daily?.levels?.length || !daily.levels[0]?.items?.length) {
      if (app) app.innerHTML = `<p class="muted">No questions available. Try again later.</p>`;
      return;
    }
    renderQuestion(daily.levels[0].items[0]);
  }

  // Autobind Start button if present (index hash route)
  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('start-btn');
    if (btn) btn.addEventListener('click', start);
  });

  return { start };
})();
