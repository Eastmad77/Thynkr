// Whylee Shell v6003 — +Play route
(() => {
  const VERSION = '6003';
  const app = document.getElementById('app');
  const tabs = Array.from(document.querySelectorAll('[data-tab]'));
  const $ver = document.getElementById('app-version');
  $ver.textContent = `Whylee v${VERSION} • Qsrc: ready`;

  // Splash
  function showSplash(){
    const splash = document.createElement('div');
    splash.id='splash'; splash.className='splash';
    splash.innerHTML = `
      <img id="splashImg" src="/media/posters/poster-start.jpg" alt="Whylee splash"/>
      <div id="tapHint">Tap to Begin</div>`;
    document.body.prepend(splash);
    const isPro = localStorage.getItem('whylee:pro')==='1';
    if (isPro){
      const v = document.createElement('video');
      Object.assign(v,{id:'splashVid',playsInline:true,muted:true,autoplay:true,src:'/media/posters/poster-start.mp4'});
      v.addEventListener('ended', removeSplash, {once:true});
      v.addEventListener('error', ()=>{}, {once:true});
      splash.replaceChild(v, document.getElementById('splashImg'));
    }
    splash.addEventListener('click', removeSplash, {once:true});
    setTimeout(removeSplash, 6500);
  }
  function removeSplash(){ const s=document.getElementById('splash'); if (!s) return; s.classList.add('hide'); setTimeout(()=> s.remove(), 350); }
  document.addEventListener('DOMContentLoaded', showSplash);

  // Routes
  const routes = {
    '#/home': () => `
      <section class="card">
        <h2>Welcome to Whylee</h2>
        <p class="muted">Your smart companion for daily focus and learning.</p>
        <div class="list">
          <button class="primary" onclick="location.hash='#/play'">Play Today’s Quiz</button>
          <div class="row"><input id="task-input" type="text" placeholder="Add a task…"/><button id="task-add" class="secondary">Add</button></div>
          <div id="task-list" class="list" aria-live="polite"></div>
        </div>
      </section>`,
    '#/play': () => `
      <section class="card" id="quizRoot">
        <div class="row" style="justify-content:space-between">
          <strong id="levelLabel">Level 1</strong>
          <span id="streakLabel" class="muted">Streak: 0 • XP: 0</span>
        </div>
        <div id="progressLabel" class="muted">Q 0/12</div>
        <div id="questionBox" style="font-size:1.25rem; text-align:center; margin:10px 0;">Loading…</div>
        <div id="choices" class="choices"></div>
        <div id="qTimer"><div id="qTimerBar"></div></div>
        <div id="elapsedTime" class="muted" style="text-align:center;margin-top:6px">0:00</div>
        <div id="badgeBox" class="list" style="margin-top:12px"></div>
      </section>`,
    '#/tasks': () => `
      <section class="card">
        <h2>Tasks</h2>
        <p class="muted">Locally stored, offline-ready.</p>
        <div class="row"><input id="task-filter" type="search" placeholder="Filter tasks…"/></div>
        <div id="task-list" class="list"></div>
      </section>`,
    '#/about': () => `
      <section class="card">
        <h2>About</h2>
        <p>Whylee is a premium PWA designed for cognitive focus and daily learning.</p>
        <ul>
          <li>Blue cinematic theme, installable</li>
          <li>Offline shell + poster preloads</li>
          <li>Pro: animated splash & extras</li>
        </ul>
      </section>`
  };

  function render(){
    const hash = location.hash || '#/home';
    const view = routes[hash] ? routes[hash]() : `<section class="card"><h2>Not found</h2></section>`;
    app.innerHTML = view;
    tabs.forEach(a => a.classList.toggle('active', a.getAttribute('href')===hash));
    if (hash.startsWith('#/home')) initHome();
    if (hash.startsWith('#/tasks')) initTasks();
    if (hash.startsWith('#/play')) {
      // kick off the game once UI exists
      setTimeout(()=> window.WhyleeGame?.start(document.getElementById('quizRoot')), 0);
    }
  }
  addEventListener('hashchange', render);
  addEventListener('DOMContentLoaded', render);

  // Install prompt + refresh
  let deferredPrompt;
  const installBtn = document.getElementById('btn-install');
  addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt = e; installBtn.hidden = false; });
  installBtn?.addEventListener('click', async ()=>{
    installBtn.disabled = true;
    if (!deferredPrompt) return;
    const { outcome } = await deferredPrompt.prompt();
    if (outcome !== 'accepted') installBtn.disabled = false;
    deferredPrompt = null; installBtn.hidden = true;
  });
  document.getElementById('btn-refresh')?.addEventListener('click', ()=> location.reload());

  // Tiny local tasks demo
  const store = { key:'whylee:tasks', all(){ try{return JSON.parse(localStorage.getItem(this.key))||[]}catch{return[]} }, save(v){ localStorage.setItem(this.key, JSON.stringify(v)); } };
  function paintTasks(listEl, items){
    listEl.innerHTML = items.map((t,i)=>`
      <div class="row">
        <label style="display:flex;gap:10px;align-items:center">
          <input type="checkbox" data-idx="${i}" ${t.done?'checked':''}/>
          <span ${t.done?'class="muted" style="text-decoration:line-through"':''}>${t.text}</span>
        </label>
        <button data-del="${i}" class="secondary">Delete</button>
      </div>`).join('');
  }
  function initHome(){
    const addBtn = document.getElementById('task-add');
    const input = document.getElementById('task-input');
    const list = document.getElementById('task-list');
    const items = store.all(); paintTasks(list, items);
    addBtn?.addEventListener('click', ()=>{
      const text=(input.value||'').trim(); if(!text) return;
      const next=[...store.all(), {text,done:false,ts:Date.now()}]; store.save(next); input.value=''; paintTasks(list,next);
    });
    list?.addEventListener('click', (e)=>{
      const del = e.target.closest('[data-del]'); const idx = del? Number(del.dataset.del):-1;
      const cb = e.target.matches('input[type="checkbox"]') ? e.target : null;
      if (idx>-1){ const next = store.all().filter((_,i)=>i!==idx); store.save(next); paintTasks(list,next); }
      if (cb){ const next = store.all(); next[Number(cb.dataset.idx)].done = cb.checked; store.save(next); paintTasks(list,next); }
    });
  }
  function initTasks(){
    const list=document.getElementById('task-list'); const filter=document.getElementById('task-filter');
    const items=store.all(); paintTasks(list, items);
    filter?.addEventListener('input', ()=>{ const q=filter.value.toLowerCase(); paintTasks(list, store.all().filter(t=>t.text.toLowerCase().includes(q))); });
  }
})();
