// scripts/shell.js — v7000
const Shell = (() => {
  const el = () => document.getElementById('app');

  const routes = {
    '#/home': () => `
      <section class="route route--home">
        <h2>Daily Challenge</h2>
        <button id="start-btn" class="primary">Start Today’s Challenge</button>
      </section>`,
    '#/tasks': () => `
      <section class="route route--tasks">
        <h2>Tasks</h2>
        <p class="muted">New modes arrive with Whylee Pro.</p>
      </section>`,
    '#/about': () => `
      <section class="route route--about">
        <h2>About Whylee</h2>
        <p class="muted">Cinematic daily brain training.</p>
      </section>`
  };

  function render(hash) {
    const target = el();
    if (!target) return;
    const view = routes[hash] || routes['#/home'];
    target.innerHTML = view();

    // highlight tabs
    document.querySelectorAll('.tabs [data-tab]').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === hash);
    });

    // bind start
    const startBtn = document.getElementById('start-btn');
    if (startBtn && window.WhyleeGame?.start) {
      startBtn.addEventListener('click', () => window.WhyleeGame.start());
    }
  }

  function onChange() { render(location.hash || '#/home'); }
  window.addEventListener('hashchange', onChange);
  window.addEventListener('DOMContentLoaded', onChange);

  return { render };
})();
