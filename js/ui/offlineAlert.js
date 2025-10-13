/**
 * Whylee offlineAlert.js
 * Displays a subtle banner when offline; hides when back online.
 * Requires the CSS below added to your stylesheet (see comment).
 */

(() => {
  const bar = document.createElement('div');
  bar.className = 'netbar';
  bar.textContent = 'You are offline — some features may be unavailable.';
  document.body.appendChild(bar);

  const apply = () => {
    bar.classList.toggle('visible', !navigator.onLine);
  };
  addEventListener('online', apply);
  addEventListener('offline', apply);
  apply();
})();

/* Add to your CSS (style.css):

.netbar{
  position:fixed; top:0; left:0; right:0;
  background:#7a1f1f; color:#fff; text-align:center;
  font:14px/1.2 system-ui, sans-serif;
  padding:8px 12px; z-index:10000; opacity:0; transform:translateY(-100%);
  transition:opacity .25s, transform .25s;
}
.netbar.visible{ opacity:1; transform:translateY(0) }
@media (prefers-reduced-motion: reduce){ .netbar{ transition:none } }

*/
