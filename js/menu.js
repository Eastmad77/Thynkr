/**
 * Whylee menu.js
 * Handles any drawer/menu toggling if you add a side menu later.
 * Wired to #btn-menu (hidden by default).
 */

(() => {
  const btn = document.getElementById('btn-menu');
  if (!btn) return;

  const drawer = document.getElementById('side-drawer');
  if (!drawer) return;

  const toggle = () => drawer.classList.toggle('open');

  btn.addEventListener('click', toggle);
  drawer.addEventListener('click', (e) => {
    if (e.target.matches('[data-close]')) toggle();
  });
})();
