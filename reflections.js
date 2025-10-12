<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="theme-color" content="#0a2a43"/>
  <title>Daily Reflections · Whylee</title>
  <link rel="manifest" href="/site.webmanifest?v=7000"/>
  <link rel="icon" href="/media/icons/favicon.svg" type="image/svg+xml"/>
  <link rel="stylesheet" href="/css/style.css?v=7000"/>
</head>
<body class="theme-dark">
  <header class="app-header">
    <a class="brand" href="/"><img src="/media/icons/app-icon.svg" alt="" class="brand-icon"/>Whylee</a>
    <nav class="top-nav">
      <a href="/achievements.html" class="top-link">Badges</a>
      <a href="/pro.html" class="top-link">Pro</a>
    </nav>
  </header>

  <main class="app-shell">
    <section class="card">
      <h1>Daily Reflection</h1>
      <p class="muted">Log one insight after your session.</p>
      <form class="list" id="reflectionForm">
        <textarea id="reflectionText" rows="5" placeholder="What did you notice today?"></textarea>
        <div class="row">
          <button class="btn primary" type="submit">Save</button>
          <button class="btn ghost" type="button" id="btnClear">Clear</button>
        </div>
      </form>
      <div id="history" class="list"></div>
    </section>
  </main>

  <footer class="app-footer">
    <nav class="tabs">
      <a href="/#/home">Home</a>
      <a href="/reflections.html" class="active">Reflections</a>
      <a href="/achievements.html">Badges</a>
    </nav>
  </footer>

  <script>
    const key='whylee:reflections';
    const $, $$ = (s)=>document.querySelector(s), (s)=>Array.from(document.querySelectorAll(s));
    const list = document.getElementById('history');
    function all(){ try{return JSON.parse(localStorage.getItem(key))||[]}catch{return[]}}
    function save(items){ localStorage.setItem(key, JSON.stringify(items)); }
    function render(){
      const items = all();
      list.innerHTML = items.map(r=>`<div class="row"><div><strong>${r.date}</strong><div class="muted">${r.text}</div></div></div>`).join('') || '<p class="muted">No reflections yet.</p>';
    }
    document.getElementById('reflectionForm')?.addEventListener('submit', (e)=>{
      e.preventDefault();
      const text = (document.getElementById('reflectionText').value||'').trim();
      if(!text) return;
      const items = all();
      items.unshift({date: new Date().toISOString().slice(0,10), text});
      save(items);
      e.target.reset(); render();
    });
    document.getElementById('btnClear')?.addEventListener('click', ()=>{
      if(!confirm('Clear all reflections?')) return;
      save([]); render();
    });
    render();
  </script>
  <script src="/js/app.js?v=7000" defer></script>
</body>
</html>
