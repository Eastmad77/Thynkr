/* ===========================================================================
   Whylee — App Shell v7000
   Lightweight SPA router + view renderer
   Handles hash navigation (#/home, #/about, etc.)
   =========================================================================== */

console.log('[Whylee] Shell loaded');

const appEl = document.getElementById('app');
const routes = {};

/**
 * Register view definitions.
 * Each view: { title, render() → string | HTMLElement }
 */
function registerRoutes() {
  routes['#/home'] = {
    title: 'Home',
    render: () => `
      <section class="view view-home fade-in">
        <h2>Welcome to <span class="brand-accent">Whylee</span></h2>
        <p>Boost your brain with fast daily challenges and reflections.</p>
        <button id="btn-play" class="primary">Start Challenge</button>
        <div class="xp-bar"><div class="fill"></div></div>
      </section>
    `
  };

  routes['#/tasks'] = {
    title: 'Tasks',
    render: () => `
      <section class="view view-tasks fade-in">
        <h2>Daily Challenges</h2>
        <ul class="task-list">
          <li>Level 1 – Memory</li>
          <li>Level 2 – Pairs</li>
          <li>Level 3 – Trivia</li>
        </ul>
        <button class="secondary" id="btn-refresh-tasks">Refresh</button>
      </section>
    `
  };

  routes['#/about'] = {
    title: 'About',
    render: () => `
      <section class="view view-about fade-in">
        <h2>About Whylee</h2>
        <p>Whylee is an interactive cognitive fitness platform built for daily engagement.</p>
        <p>Play short sessions, earn XP, and unlock Pro insights.</p>
        <small class="muted">Version 7.0.0</small>
      </section>
    `
  };
}

/**
 * Renders a route based on the hash.
 */
function renderRoute(hash) {
  const route = routes[hash] || routes['#/home'];
  document.title = `Whylee – ${route.title}`;
  appEl.innerHTML = route.render();

  // Optional: Add event hooks
  if (hash === '#/home') {
    const playBtn = document.getElementById('btn-play');
    playBtn?.addEventListener('click', () => {
      location.hash = '#/tasks';
    });
  }

  if (hash === '#/tasks') {
    document.getElementById('btn-refresh-tasks')?.addEventListener('click', () => {
      renderRoute('#/tasks');
    });
  }
}

/**
 * Initialize shell
 */
function initShell() {
  registerRoutes();

  // Handle hash navigation
  window.addEventListener('hashchange', () => {
    renderRoute(location.hash);
    highlightTab(location.hash);
  });

  // Initial route
  if (!location.hash) location.hash = '#/home';
  renderRoute(location.hash);
  highlightTab(location.hash);
}

/**
 * Highlight active footer tab
 */
function highlightTab(hash) {
  document.querySelectorAll('.tabs a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === hash);
  });
}

// Launch
window.addEventListener('DOMContentLoaded', initShell);
