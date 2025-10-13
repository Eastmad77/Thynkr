// ============================================================================
// updatePrompt.js — Notifies user when a new PWA version is available
// -----------------------------------------------------------------------------
// Shows a floating toast when the Service Worker detects a new version.
// User can tap to refresh and load latest assets without a full app restart.
// ============================================================================

export function registerUpdatePrompt() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    showUpdateToast();
  });

  // Listen for custom message from SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NEW_VERSION') {
      showUpdateToast();
    }
  });
}

function showUpdateToast() {
  // Remove existing
  const oldToast = document.getElementById('update-toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.id = 'update-toast';
  toast.innerHTML = `
    <div class="toast-inner">
      <span>✨ New version available</span>
      <button id="update-reload-btn">Refresh</button>
    </div>
  `;
  document.body.appendChild(toast);

  toast.querySelector('#update-reload-btn').onclick = () => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      window.location.reload(true);
    }, 500);
  };
}

// Optional CSS (include in style.css or animations.css)
//
// #update-toast {
//   position: fixed;
//   bottom: 1.5rem;
//   left: 50%;
//   transform: translateX(-50%);
//   background: #0a2a43cc;
//   color: #fff;
//   padding: 0.75rem 1.25rem;
//   border-radius: 1rem;
//   display: flex;
//   align-items: center;
//   gap: 0.5rem;
//   box-shadow: 0 4px 20px rgba(0,0,0,0.25);
//   z-index: 9999;
//   font-size: 0.9rem;
//   animation: fadeIn 0.4s ease;
// }
// #update-toast.fade-out { opacity: 0; transition: opacity 0.3s; }
// #update-reload-btn {
//   background: #d88c0e;
//   border: none;
//   color: #fff;
//   padding: 0.4rem 0.9rem;
//   border-radius: 0.5rem;
//   cursor: pointer;
// }
// #update-reload-btn:hover { background: #ff9d1a; }
// ```

---

Next:  
📁 `/js/entitlements/plan.js` — handles user plan logic (Free vs Pro, active trial, expiry checks).  
Continue?
