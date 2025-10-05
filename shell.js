/* =======================================================
   Thynkr Shell — UI wiring, SW registration, PWA helpers
   ======================================================= */

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Side menu (ARIA-friendly) ----------
  const menuBtn = $('#mmMenuBtn');
  const sideMenu = $('#mmSideMenu');

  function openMenu() {
    if (!sideMenu) return;
    sideMenu.classList.add('visible');
    sideMenu.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    if (!sideMenu) return;
    sideMenu.classList.remove('visible');
    sideMenu.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (menuBtn && sideMenu) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = sideMenu.classList.contains('visible');
      isOpen ? closeMenu() : openMenu();
    });

    // Close when clicking outside the menu
    document.addEventListener('click', (e) => {
      if (!sideMenu.classList.contains('visible')) return;
      const within = sideMenu.contains(e.target) || (menuBtn && menuBtn.contains(e.target));
      if (!within) closeMenu();
    });

    // Close on Esc
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sideMenu.classList.contains('visible')) closeMenu();
    });
  }

  // ---------- Mark active nav link ----------
  (function setActiveNav() {
    const path = location.pathname.replace(/\/+$/, '') || '/';
    $$('.menu-nav a').forEach((a) => {
      try {
        const href = new URL(a.href, location.origin).pathname.replace(/\/+$/, '') || '/';
        if (href === path) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      } catch {}
    });
  })();

  // ---------- Share button (progressive) ----------
  const shareBtn = $('#shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      try {
        const shareData = {
          title: document.title || 'Thynkr',
          text: 'Sharpen your mind — daily with Thynkr.',
          url: location.href
        };
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(shareData.url);
          toast('Link copied to clipboard');
        }
      } catch (err) {
        console.warn('Share failed:', err);
        toast('Could not share');
      }
    });
  }

  // ---------- Optional Sound toggle (if present) ----------
  const soundBtn = $('#soundBtn');
  if (soundBtn) {
    const KEY = 'thynkr:sound';
    let enabled = localStorage.getItem(KEY);
    if (enabled == null) {
      enabled = '1'; // default on (no sounds used yet, but future-ready)
      localStorage.setItem(KEY, enabled);
    }
    updateSoundIcon();

    soundBtn.addEventListener('click', () => {
      enabled = enabled === '1' ? '0' : '1';
      localStorage.setItem(KEY, enabled);
      updateSoundIcon();
      toast(enabled === '1' ? 'Sound on' : 'Sound off');
    });

    function updateSoundIcon() {
      soundBtn.textContent = (enabled === '1') ? '🔊' : '🔈';
      soundBtn.setAttribute('aria-pressed', enabled === '1' ? 'true' : 'false');
    }
  }

  // ---------- PWA Install prompt (deferred) ----------
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // You could reveal a small CTA somewhere; for now we remain quiet.
    // Example: showInstallCTA();
  });

  // Example hook if you later add a "Install App" button:
  // const installBtn = $('#installBtn');
  // if (installBtn) {
  //   installBtn.addEventListener('click', async () => {
  //     if (!deferredPrompt) return;
  //     deferredPrompt.prompt();
  //     const choice = await deferredPrompt.userChoice;
  //     deferredPrompt = null;
  //     toast(choice.outcome === 'accepted' ? 'App installed' : 'Install dismissed');
  //   });
  // }

  // ---------- Service Worker registration & updates ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').then((reg) => {
        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content available
                showUpdateToast(() => {
                  // Tell SW to activate immediately
                  reg.waiting && reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                  // Reload to get the latest
                  window.location.reload();
                });
              } else {
                // First install
                console.log('Service worker installed.');
              }
            }
          });
        });

        // If a waiting SW exists (e.g., on page revisit), prompt to refresh
        if (reg.waiting) {
          showUpdateToast(() => {
            reg.waiting && reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          });
        }

        // When the controller changes (after SKIP_WAITING), you can react if needed
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('SW controller changed.');
        });
      }).catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });

    // Optional: allow SW to message the page
    navigator.serviceWorker.addEventListener('message', (event) => {
      // e.g., event.data => { type: 'CACHE_WARMED' }
      // console.log('SW message:', event.data);
    });
  }

  // ---------- Tiny toast utility ----------
  let toastTimer = null;
  function toast(msg, ms = 2200) {
    let el = $('#th-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'th-toast';
      el.style.position = 'fixed';
      el.style.left = '50%';
      el.style.bottom = '22px';
      el.style.transform = 'translateX(-50%)';
      el.style.zIndex = '3000';
      el.style.background = 'rgba(0,0,0,0.7)';
      el.style.color = '#fff';
      el.style.padding = '10px 14px';
      el.style.borderRadius = '10px';
      el.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      el.style.fontSize = '14px';
      el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
      el.style.opacity = '0';
      el.style.transition = 'opacity .25s ease';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, ms);
  }

  function showUpdateToast(onConfirm) {
    let bar = $('#th-update');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'th-update';
      bar.style.position = 'fixed';
      bar.style.inset = 'auto 12px 12px 12px';
      bar.style.zIndex = '3500';
      bar.style.display = 'flex';
      bar.style.alignItems = 'center';
      bar.style.justifyContent = 'space-between';
      bar.style.gap = '12px';
      bar.style.padding = '12px 14px';
      bar.style.borderRadius = '12px';
      bar.style.background = 'rgba(8, 26, 45, 0.9)';
      bar.style.color = '#fff';
      bar.style.boxShadow = '0 10px 24px rgba(0,0,0,0.4)';
      bar.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      bar.style.fontSize = '14px';

      const text = document.createElement('div');
      text.textContent = 'A new version of Thynkr is available.';
      const btn = document.createElement('button');
      btn.textContent = 'Refresh';
      btn.style.background = '#17f1d1';
      btn.style.color = '#081a2d';
      btn.style.border = 'none';
      btn.style.fontWeight = '700';
      btn.style.padding = '8px 12px';
      btn.style.borderRadius = '8px';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', () => {
        onConfirm && onConfirm();
        bar.remove();
      });

      bar.appendChild(text);
      bar.appendChild(btn);
      document.body.appendChild(bar);
    }
  }
})();
