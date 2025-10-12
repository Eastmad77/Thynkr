/* =========================================================
   Whylee v7 — App Shell & Router
   - Hash routes
   - Minimal Home / Tasks / About skeleton
   - Wires Game Core on #/play
   ========================================================= */
(() => {
  const app = document.getElementById('app');
  const tabs = Array.from(document.querySelectorAll('[data-tab]'));
  const $ver = document.getElementById('app-version');
  if ($ver) $ver.textContent = `Whylee v${window.WHYLEE_BUILD || '—'}`;

  // -------------- Views --------------
  const views = {
    '#/home': () => `
      <section class="card hero fade-in-up">
        <img class="hero-img" src="/media/posters/poster-start.jpg" alt="Welcome to Whylee"/>
        <div class="hero-overlay">
          <h2 class="hero-title">Sharpen your mind, daily.</h2>
          <p class="hero-subtitle">Fast, cinematic, offline-ready. Install and play anywhere.</p>
          <div class="hero-cta">
            <a class="btn primary pulse" href="#/play">Play Now</a>
            <a class="btn ghost" href="#/about">About</a>
          </div>
        </div>
      </section>

      <section class="card grid-3 fade-in-up">
        <div class="badge-tile">
          <div class="badge-ico">⚡</div>
          <div class="muted">XP & Streaks</div>
        </div>
        <div class="badge-tile">
          <div class="badge-ico">🏅</div>
          <div class="muted">Badges & Levels</div>
        </div>
        <div class="badge-tile">
          <div class="badge-ico">🦊</div>
          <div class="muted">Reactive Avatar</div>
        </div>
      </section>
    `,
    '#/tasks': () => `
      <section class="card fade-in-up">
        <h2>Your Notes</h2>
        <p class="muted">Lightweight local notes that work offline.</p>
        <div class="row gap">
          <input id="task-input" type="text" placeholder="Add a note…"/>
          <button id="task-add" class="btn primary">Add</button>
        </div>
        <div id="task-list" class="list" aria-live="polite" style="margin-top:12px"></div>
      </section>
    `,
    '#/about': () => `
      <section class="card fade-in-up">
        <h2>About Whylee</h2>
        <p>Whylee is a premium-feel cognitive companion built as a PWA. It’s fast, installable, and works offline.</p>
        <ul>
          <li>Cache-first app shell</li>
          <li>Daily questions & levels</li>
          <li>Pro mode with ambient effects</li>
        </ul>
        <p class="muted">Build ${window.WHYLEE_BUILD || ''}</p>
      </section>
    `,
    '#/play': () => `
      <section class="card fade-in-up">
        <div class="row gap">
          <img src="/media/avatars/fox-default.png" class="avatar-lg" alt="Whylee avatar" />
          <div class="spacer">
            <div class="stat" style="margin-bottom:10px">
              <div class="muted">XP</div>
              <div class="bar streak-glow"><i id="xpBar" style="width:0%"></i></div>
            </div>
            <div class="stat">
              <div class="muted">Daily Streak</div>
              <div class="bar"><i id="streakBar" style="width:0%"></i></div>
            </div>
          </div>
        </div>
      </section>

      <section class="card fade-in-up">
        <div class="row gap">
          <button id="btnStart" class="btn primary">Start</button>
          <button id="btnHow" class="btn secondary">How it works</button>
          <button id="btnReset" class="btn ghost">Reset</button>
        </div>

        <div class="q-timer"><i id="qTimerBar"></i></div>
        <div class="row wrap gap">
          <strong id="levelLabel">Level 1</strong>
          <span class="muted" id="progressLabel">Q 0/12</span>
          <span class="muted" id="elapsedTime">0:00</span>
        </div>
        <h3 id="questionBox" style="min-height:48px; margin:8px 0 12px">Press Start to Play</h3>
        <div id="choices" class="list"></div>
      </section>

      <div id="countdownOverlay" class="overlay hidden">
        <div class="count-num" id="countNum">3</div>
      </div>

      <div id="gameOverBox" class="overlay hidden">
        <section class="card center" style="max-width:520px">
          <h2 id="gameOverText">All levels complete — see you tomorrow!</h2>
          <div class="row gap center" style="justify-content:center; margin-top:10px">
            <button id="playAgainBtn" class="btn primary">Play again</button>
            <button id="shareBtn" class="btn secondary">Share</button>
          </div>
        </section>
      </div>

      <audio id="sfxPerfect" preload="auto" src="/media/audio/thynkr-victory.mp3"></audio>
      <div id="perfectBurst" class="burst"></div>
    `
  };

  // -------------- Render & Route --------------
  function render() {
    const hash = location.hash || '#/home';
    const view = views[hash] ? views[hash]() : `<section class="card"><h2>Not found</h2></section>`;
    app.innerHTML = view;

    // tab active state
    tabs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === hash));

    // wire per-view
    if (hash === '#/tasks') initTasks();
    if (hash === '#/play') window.WhyleeGameCore?.init?.();
  }
  addEventListener('hashchange', render);
  addEventListener('DOMContentLoaded', render);

  // -------------- Notes Store --------------
  const store = {
    key: 'whylee:notes',
    all() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
    save(items) { localStorage.setItem(this.key, JSON.stringify(items)); }
  };

  function paint(listEl, items) {
    listEl.innerHTML = items.map((t, i) => `
      <div class="row nav">
        <span>${t.text}</span>
        <button class="btn ghost" data-del="${i}">Delete</button>
      </div>
    `).join('');
  }

  function initTasks() {
    const addBtn = document.getElementById('task-add');
    const input = document.getElementById('task-input');
    const list = document.getElementById('task-list');
    const items = store.all();
    paint(list, items);

    addBtn?.addEventListener('click', () => {
      const text = (input.value || '').trim();
      if (!text) return;
      const next = [...store.all(), { text, ts: Date.now() }];
      store.save(next); input.value = ''; paint(list, next);
    });

    list?.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (!del) return;
      const idx = Number(del.dataset.del);
      const next = store.all().filter((_, i) => i !== idx);
      store.save(next); paint(list, next);
    });
  }

})();
