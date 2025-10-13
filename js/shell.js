/**
 * Whylee shell.js (v7000)
 * - Hash router (home, tasks, about)
 * - Task list (localStorage) with basic CRUD
 * - Header actions (install, refresh)
 * - Lightweight accessibility + storage estimate
 */

(() => {
  const VERSION = '7000';

  // DOM refs
  const app = document.getElementById('app');
  const $ver = document.getElementById('app-version');
  const tabs = Array.from(document.querySelectorAll('[data-tab]'));
  const btnInstall = document.getElementById('btn-install');
  const btnRefresh = document.getElementById('btn-refresh');

  if ($ver) $ver.textContent = `Whylee v${VERSION}`;

  // ------------------ Router ------------------
  const routes = {
    '#/home': () => `
      <section class="card">
        <h2>Welcome to Whylee</h2>
        <p class="muted">Cinematic, offline-ready daily challenges.</p>
        <div class="kv" style="margin-top:10px">
          <span class="badge">Service Worker</span><span id="sw-status">Checking…</span>
          <span class="badge">Storage</span><span id="storage-info">–</span>
        </div>
      </section>

      <section class="card">
        <h2>Quick Tasks</h2>
        <div class="list">
          <div class="row">
            <input id="task-input" type="text" placeholder="Add a task…"/>
            <button id="task-add" class="primary">Add</button>
          </div>
          <div id="task-list" class="list" aria-live="polite"></div>
        </div>
      </section>
    `,
    '#/tasks': () => `
      <section class="card">
        <h2>Your Tasks</h2>
        <p class="muted">Synced locally. Works offline.</p>
        <div class="row"><input id="task-filter" type="search" placeholder="Filter tasks…"/></div>
        <div id="task-list" class="list" aria-live="polite"></div>
      </section>
    `,
    '#/about': () => `
      <section class="card">
        <h2>About</h2>
        <p>Whylee is a lightweight PWA with robust caching, a safe preload strategy, and a cinematic UI.</p>
        <ul>
          <li>Installable on mobile & desktop</li>
          <li>Offline fallback and cache-first shell</li>
          <li>Privacy-first — data stays on device</li>
        </ul>
      </section>
    `
  };

  function render() {
    const hash = location.hash || '#/home';
    const view = routes[hash] ? routes[hash]() :
      `<section class="card"><h2>Not found</h2><p class="muted">The view “${hash}” doesn’t exist.</p></section>`;
    app.innerHTML = view;

    // tab highlight
    tabs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === hash));

    // page-specific init
    if (hash.startsWith('#/home')) initHome();
    if (hash.startsWith('#/tasks')) initTasks();
  }

  addEventListener('hashchange', render);
  addEventListener('DOMContentLoaded', render);

  // ------------------ Local Store (tasks) ------------------
  const store = {
    key: 'whylee:tasks',
    all() {
      try { return JSON.parse(localStorage.getItem(this.key)) || []; }
      catch { return []; }
    },
    save(items) {
      localStorage.setItem(this.key, JSON.stringify(items));
      dispatchEvent(new Event('storage:tasks'));
    }
  };

  function paintTasks(listEl, items) {
    listEl.innerHTML = items.map((t, i) => `
      <div class="row" role="listitem">
        <label style="display:flex; gap:10px; align-items:center">
          <input type="checkbox" data-idx="${i}" ${t.done ? 'checked' : ''}/>
          <span ${t.done ? 'class="muted" style="text-decoration:line-through"' : ''}>${t.text}</span>
        </label>
        <button data-del="${i}" class="secondary">Delete</button>
      </div>
    `).join('');
  }

  // ------------------ Views ------------------
  function initHome() {
    // SW status
    const swStatus = document.getElementById('sw-status');
    navigator.serviceWorker?.getRegistration().then(r => {
      swStatus.textContent = r ? 'Active' : 'Not registered';
    });

    // storage estimate
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(({ usage, quota }) => {
        const usedMB = (usage / 1048576).toFixed(1);
        const qMB = (quota / 1048576).toFixed(0);
        const el = document.getElementById('storage-info');
        if (el) el.textContent = `${usedMB} MB of ~${qMB} MB`;
      });
    }

    // tasks quick add
    const addBtn = document.getElementById('task-add');
    const input = document.getElementById('task-input');
    const list = document.getElementById('task-list');

    const items = store.all();
    paintTasks(list, items);

    addBtn?.addEventListener('click', () => {
      const text = (input.value || '').trim();
      if (!text) return;
      const next = [...store.all(), { text, done: false, ts: Date.now() }];
      store.save(next);
      input.value = '';
      paintTasks(list, next);
    });

    list?.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) {
        const idx = Number(del.dataset.del);
        const next = store.all().filter((_, i) => i !== idx);
        store.save(next);
        paintTasks(list, next);
        return;
      }
      if (e.target.matches('input[type="checkbox"]')) {
        const idx = Number(e.target.dataset.idx);
        const next = store.all();
        next[idx].done = e.target.checked;
        store.save(next);
        paintTasks(list, next);
      }
    });
  }

  function initTasks() {
    const list = document.getElementById('task-list');
    const filter = document.getElementById('task-filter');

    paintTasks(list, store.all());

    filter?.addEventListener('input', () => {
      const q = filter.value.toLowerCase();
      const results = store.all().filter(t => t.text.toLowerCase().includes(q));
      paintTasks(list, results);
    });
  }

  // ------------------ Header actions ------------------
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstall) btnInstall.hidden = false;
  });

  btnInstall?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    btnInstall.disabled = true;
    const { outcome } = await deferredPrompt.prompt();
    if (outcome !== 'accepted') btnInstall.disabled = false;
    deferredPrompt = null;
    btnInstall.hidden = true;
  });

  btnRefresh?.addEventListener('click', () => location.reload());
})();
