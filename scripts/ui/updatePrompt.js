// scripts/ui/updatePrompt.js — v7000
(() => {
  const promptEl = document.getElementById('updatePrompt');
  const btnNow = document.getElementById('btnUpdateNow');
  const btnLater = document.getElementById('btnUpdateLater');

  function show(){ if (promptEl) promptEl.style.display = 'block'; }
  function hide(){ if (promptEl) promptEl.style.display = 'none'; }

  // SW → page broadcast channel
  if ('BroadcastChannel' in window) {
    const ch = new BroadcastChannel('whylee-sw');
    ch.onmessage = (ev) => { if (ev?.data === 'NEW_VERSION') show(); };
  }

  btnNow?.addEventListener('click', async () => {
    hide();
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      regs.forEach(r => r.update());
    }
    location.reload();
  });
  btnLater?.addEventListener('click', hide);
})();
