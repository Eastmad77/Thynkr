// scripts/core.js — v7000 (pairs + ad poster + redemption + optional AdSense)
import { loadQuestionsForToday } from './questions.js';
import { Achievements } from './achievements.js';

window.WhyleeGame = (function () {
  // --- SFX ---
  const sfx = {
    click: new Audio('/media/audio/soft-click.mp3'),
    correct: new Audio('/media/audio/correct.mp3'),
    wrong: new Audio('/media/audio/wrong.mp3'),
    levelup: new Audio('/media/audio/levelup.mp3'),
    start: new Audio('/media/audio/start-chime.mp3')
  };
  Object.values(sfx).forEach(a => a && (a.volume = 0.6));

  // --- Poster overlay ---
  function showPoster(fileOrKey, { autohide = 0 } = {}) {
    const map = {
      countdown: 'poster-01-start.png',
      level2:    'poster-06-challenge.png',
      level3:    'poster-08-levelup.png',
      success:   'poster-03-reward.png',
      night:     'poster-10-brand.png'
    };
    const fname = (fileOrKey || '').endsWith('.png') ? fileOrKey : (map[fileOrKey] || map.countdown);
    const urlImg = `/media/posters/v1/${fname}`;

    const overlay = document.createElement('div');
    overlay.className = 'overlay-poster';
    overlay.innerHTML = `<img src="${urlImg}" alt="" />`;
    Object.assign(overlay.style, { position:'fixed', inset:0, zIndex:9999, display:'grid', placeItems:'center', background:'rgba(0,0,0,.85)' });
    const img = overlay.querySelector('img');
    Object.assign(img.style, { maxWidth:'92vw', maxHeight:'92vh', borderRadius:'16px', boxShadow:'0 12px 48px rgba(0,0,0,.6)' });
    document.body.appendChild(overlay);
    if (autohide > 0) setTimeout(() => overlay.remove(), autohide);
    overlay.addEventListener('click', () => overlay.remove(), { once:true });
  }

  // --- Day-complete marker (separate daily streak) ---
  function markDayComplete() {
    const KEY_LAST = 'wl_last_date';
    const KEY_STREAK = 'wl_daystreak';
    const today = new Date().toISOString().slice(0,10);
    const last = localStorage.getItem(KEY_LAST);
    let streak = Number(localStorage.getItem(KEY_STREAK) || '0');
    if (last === today) return;
    if (!last) streak = 1; else {
      const d = new Date(last); d.setDate(d.getDate() + 1);
      streak = (d.toISOString().slice(0,10) === today) ? streak + 1 : 1;
    }
    localStorage.setItem(KEY_STREAK, String(streak));
    localStorage.setItem(KEY_LAST, today);
    dispatchEvent(new CustomEvent('wl:day-complete', { detail: { streak } }));
  }

  // --- Timer HUD ---
  let startedAt = 0, timerHandle = null;
  function fmtTime(ms){ const s = Math.floor(ms/1000), m = Math.floor(s/60), r = s%60; return `${m}:${r<10?'0':''}${r}`; }
  function startElapsed(){ startedAt = Date.now(); stopElapsed(); tick(); }
  function stopElapsed(){ if (timerHandle) { clearTimeout(timerHandle); timerHandle = null; } }
  function tick(){ const hud = document.getElementById('wl-elapsed'); if (hud) hud.textContent = fmtTime(Date.now()-startedAt); timerHandle = setTimeout(tick, 250); }

  // --- State ---
  let daily = null;
  let currentLevel = 0; // 0-based
  let qIndex = 0;
  let combo = 0; // for redemption rule
  let wrongCount = 0;

  // --- Render MCQ ---
  function renderQuestion(q) {
    const app = document.getElementById('app');
    if (!app) return;
    const levelCount = daily.levels[currentLevel].items.length;
    app.innerHTML = `
      <section class="route route--play">
        <header class="play-hud">
          <span>Level ${currentLevel + 1}/${daily.levels.length}</span>
          <span>Streak: ${Achievements.state.streak}</span>
          <span>XP: ${Achievements.state.xp}</span>
          <span>Q ${qIndex + 1}/${levelCount}</span>
          <span id="wl-elapsed" class="muted">0:00</span>
        </header>
        <div class="question">${q.question}</div>
        <div id="wl-choices" class="choices">
          ${q.choices.map((c,i)=>`<button class="choice" data-i="${i}">${c}</button>`).join('')}
        </div>
      </section>`;
    app.querySelectorAll('.choice').forEach(btn => {
      btn.addEventListener('click', () => onAnswer(parseInt(btn.dataset.i,10)));
    });
  }

  function blink(ok) {
    const box = document.getElementById('wl-choices');
    if (!box) return;
    box.classList.remove('blink-ok','blink-bad'); void box.offsetWidth;
    box.classList.add(ok ? 'blink-ok' : 'blink-bad');
    setTimeout(()=> box.classList.remove('blink-ok','blink-bad'), 260);
  }

  // --- Pairs (Level 2) ---
  function renderPairsLevel(levelData) {
    const app = document.getElementById('app');
    if (!app) return;

    // Build and shuffle deck
    const deck = [];
    levelData.items.forEach((p, idx) => {
      deck.push({ id:`L${idx}`, text:p.left,  pair:idx });
      deck.push({ id:`R${idx}`, text:p.right, pair:idx });
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    app.innerHTML = `
      <section class="route route--pairs">
        <header class="play-hud">
          <span>Level ${currentLevel + 1}/${daily.levels.length} — Matching Pairs</span>
          <span>Streak: ${Achievements.state.streak}</span>
          <span>XP: ${Achievements.state.xp}</span>
          <span id="wl-elapsed" class="muted">0:00</span>
        </header>
        <div class="pairs-grid" id="pairsGrid"></div>
      </section>`;

    const grid = document.getElementById('pairsGrid');
    let first = null, lock = false, matched = 0;

    deck.forEach(card => {
      const el = document.createElement('button');
      el.className = 'pair-card';
      el.dataset.pair = String(card.pair);
      el.textContent = card.text;
      el.addEventListener('click', () => onFlip(card, el));
      grid.appendChild(el);
    });

    function onFlip(card, el) {
      if (lock || el.classList.contains('matched')) return;
      sfx.click.play().catch(()=>{});
      if (!first) { first = { card, el }; el.classList.add('selected'); return; }

      el.classList.add('selected'); lock = true;
      const isMatch = first.card.pair === card.pair && first.el !== el;

      setTimeout(() => {
        if (isMatch) {
          sfx.correct.play().catch(()=>{});
          first.el.classList.add('matched'); el.classList.add('matched');
          matched += 2;
          Achievements.awardXP(20);
          Achievements.addStreak(1);
          combo = Math.min(3, combo + 1); // maintain combo similarly for parity
          if (matched >= deck.length) {
            sfx.levelup.play().catch(()=>{});
            currentLevel++; qIndex = 0;
            startLevel(); // go next (or end)
          }
        } else {
          sfx.wrong.play().catch(()=>{});
          Achievements.resetStreak();
          combo = 0;
          first.el.classList.remove('selected');
          el.classList.remove('selected');
        }
        first = null; lock = false;
      }, 450);
    }
  }

  // --- MCQ answer flow with Redemption Rule ---
  function onAnswer(i) {
    const q = daily.levels[currentLevel].items[qIndex];
    const correct = i === q.correctIndex;

    if (correct) {
      sfx.correct.play().catch(()=>{});
      Achievements.awardXP(25);
      Achievements.addStreak(1);
      combo = Math.min(3, combo + 1);

      // Redemption: 3-in-a-row removes one wrong (session-level)
      if (combo >= 3 && wrongCount > 0) {
        wrongCount = Math.max(0, wrongCount - 1);
        combo = 0;
      }
      blink(true);
    } else {
      sfx.wrong.play().catch(()=>{});
      Achievements.resetStreak();
      combo = 0;
      wrongCount += 1;
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
    sfx.levelup.play().catch(()=>{});
    currentLevel++; qIndex = 0;

    // Between Level 2 → 3: show ad poster for Free users
    if (currentLevel === 2 && !window.WhyleePro?.isPro()) {
      const adFile = (daily.adPoster && daily.adPoster.endsWith('.png')) ? daily.adPoster : 'poster-ad-sponsor.png';
      showPoster(adFile, { autohide: 2500 });
    }

    startLevel();
  }

  function endSession() {
    stopElapsed();
    markDayComplete();

    const approxCorrect = Achievements.state.xp / 25; // rough estimate for MCQs
    const success = approxCorrect >= 12; // heuristic
    showPoster(success ? 'success' : 'night', { autohide: 1600 });

    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <section class="route route--end">
        <h2>Great session!</h2>
        <p>Streak: ${Achievements.state.streak} · XP: ${Achievements.state.xp}</p>
        <button id="play-again" class="primary">Play Again</button>
        <div id="wl-end-ad"></div>
      </section>`;

    // Optional end-of-session AdSense (online + Free only)
    if (!window.WhyleePro?.isPro() && navigator.onLine && window.adsbygoogle) {
      const slot = document.getElementById('wl-end-ad');
      slot.innerHTML = `
        <div class="wl-ad">
          <ins class="adsbygoogle" style="display:block"
               data-ad-client="ca-pub-XXXXXXXXXXXX"
               data-ad-slot="1234567890"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        </div>`;
      try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
    }

    document.getElementById('play-again')?.addEventListener('click', start);
  }

  function startLevel() {
    const lvData = daily.levels[currentLevel];
    if (!lvData) { endSession(); return; }

    // Posters per level
    if (currentLevel === 0) showPoster('countdown', { autohide: 800 });
    if (currentLevel === 1) showPoster('level2',   { autohide: 800 });
    if (currentLevel === 2) showPoster('level3',   { autohide: 800 });

    startElapsed();

    if (lvData.type === 'pairs') {
      renderPairsLevel(lvData);
    } else {
      if (!lvData.items?.length) { endSession(); return; }
      renderQuestion(lvData.items[0]);
    }
  }

  async function start() {
    try { sfx.start.play().catch(()=>{}); } catch {}
    const app = document.getElementById('app');
    if (app) app.innerHTML = `<p class="muted">Loading today’s questions…</p>`;

    daily = await loadQuestionsForToday();
    currentLevel = 0; qIndex = 0; combo = 0; wrongCount = 0;

    if (!daily?.levels?.length) {
      if (app) app.innerHTML = `<p class="muted">No questions available. Try again later.</p>`;
      return;
    }
    startLevel();
  }

  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('start-btn');
    if (btn) btn.addEventListener('click', start);
  });

  return { start };
})();
