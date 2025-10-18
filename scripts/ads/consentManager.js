/**
 * Whylee Consent Manager (GDPR/CCPA friendly)
 * - Shows a minimal consent banner on first visit (or until user chooses)
 * - Persists in localStorage
 * - Exposes getConsent() and onConsent()
 * - Signals AdSense (personalized vs non-personalized)
 */

const STORE_KEY = "wl.consents.v1";
let listeners = [];

export function getConsent() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || { ads: null, analytics: true }; }
  catch { return { ads: null, analytics: true }; }
}
export function onConsent(fn) { listeners.push(fn); }
function save(consent) {
  localStorage.setItem(STORE_KEY, JSON.stringify(consent));
  listeners.forEach(fn => fn(consent));
}
function isEEAUserHeuristic() {
  // Heuristic: prefer UA/GPC; default to showing the banner (safer)
  try {
    if (navigator.globalPrivacyControl) return true; // privacy-centric users → show banner
    // If you want a precise EEA check, use a server hint (GeoIP) via a response header.
  } catch {}
  return true; // safest default: show banner
}

export function shouldShowBanner() {
  const c = getConsent();
  return c.ads === null && isEEAUserHeuristic();
}

export function mountConsentBanner() {
  if (!shouldShowBanner()) return;

  const bar = document.createElement("div");
  bar.className = "wl-consent";
  bar.innerHTML = `
    <div class="wl-consent__inner">
      <div class="wl-consent__copy">
        We use cookies for site performance and ads. Choose your preferences.
        <a href="/privacy.html" target="_blank" rel="noopener">Learn more</a>.
      </div>
      <div class="wl-consent__actions">
        <button id="wlConsentAllow" class="btn btn--brand">Allow personalized ads</button>
        <button id="wlConsentNonPers" class="btn">Continue without personalization</button>
      </div>
    </div>
  `;
  document.body.appendChild(bar);

  document.getElementById("wlConsentAllow").addEventListener("click", () => {
    save({ ads: "personalized", analytics: true, ts: Date.now() });
    bar.remove();
  });
  document.getElementById("wlConsentNonPers").addEventListener("click", () => {
    save({ ads: "non_personalized", analytics: true, ts: Date.now() });
    bar.remove();
  });
}

// Style (scoped) – inject minimal CSS if not present
(function ensureCss(){
  if (document.getElementById("wl-consent-css")) return;
  const s = document.createElement("style");
  s.id = "wl-consent-css";
  s.textContent = `
  .wl-consent{position:fixed;left:0;right:0;bottom:0;z-index:9999;
    background:rgba(10,14,23,.92);backdrop-filter:blur(6px);color:#fff;padding:12px 16px}
  .wl-consent__inner{max-width:980px;margin:0 auto;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
  .wl-consent__copy{opacity:.9;font-size:.95rem}
  .wl-consent__copy a{color:#7dd3fc}
  .wl-consent__actions{display:flex;gap:8px}
  `;
  document.head.appendChild(s);
})();
