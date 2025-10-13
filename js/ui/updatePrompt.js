/**
 * Whylee updatePrompt.js
 * Handles service worker updates (SW_UPDATED broadcast)
 * Shows a “New version available” toast with a refresh button
 * Automatically reloads when new SW takes control
 */

(() => {
  // Guard
  if (!('BroadcastChannel' in self)) return;

  // Create BroadcastChannel to listen for SW messages
  const channel = new BroadcastChannel('sw-messages');

  // Build toast element
  const toast = document.createElement('div');
  toast.className = 'update-toast hidden';
  toast.innerHTML = `
    <div class="update-toast-inner">
      <span>✨ New version available</span>
      <button id="update-refresh">Refresh</button>
    </div>
  `;
  document.body.appendChild(toast);

  const refreshButton = toast.querySelector('#update-refresh');
  refreshButton.addEventListener('click', () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    });
    toast.classList.add('fade-out');
    setTimeout(() => location.reload(), 600);
  });

  // When SW sends an update broadcast
  channel.addEventListener('message', (event) => {
    if (!event.data || event.data.type !== 'SW_UPDATED') return;
    toast.classList.remove('hidden');
    toast.classList.add('visible');
  });

  // Auto-reload once the new SW takes control
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    toast.classList.add('fade-out');
    setTimeout(() => location.reload(), 600);
  });
})();
