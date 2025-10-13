/**
 * Whylee installPrompt.js
 * Optional custom “Install” CTA you can place anywhere in your UI.
 * Adds/removes a CSS class on <body> to reveal an install banner.
 */

(() => {
  let deferredPrompt = null;
  const cls = 'show-install-banner';

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.body.classList.add(cls);
  });

  // Handlers you can wire to buttons:
  window.WhyleeInstall = {
    async confirm() {
      if (!deferredPrompt) return;
      const { outcome } = await deferredPrompt.prompt();
      deferredPrompt = null;
      document.body.classList.remove(cls);
      return outcome; // 'accepted' | 'dismissed'
    },
    dismiss() {
      document.body.classList.remove(cls);
    }
  };
})();
