/**
 * Whylee AdSense Loader (Web only, marketing pages)
 * - Respects consentManager (personalized vs non-personalized)
 * - Provides createResponsiveAd(container, slotId)
 * - Kill-switch via ?ads=off or localStorage wl.ads.off = "1"
 */

import { getConsent, onConsent } from "/scripts/ads/consentManager.js";

const CLIENT_ID = "ca-pub-XXXXXXXXXXXXXXXX"; // <-- REPLACE with your AdSense publisher id
let scriptLoaded = false;

function adsDisabled() {
  try {
    if (new URLSearchParams(location.search).get("ads") === "off") return true;
    if (localStorage.getItem("wl.ads.off") === "1") return true;
  } catch {}
  return false;
}

function ensureScript(consent) {
  if (scriptLoaded || adsDisabled()) return;
  // Configure non-personalized if needed
  if (consent?.ads === "non_personalized") {
    window.google_ad_client = CLIENT_ID;
    window.google_adtest = "on"; // remove once verified during dev
    window.google_ad_personalization = "0";
  }
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
  s.setAttribute("data-ad-client", CLIENT_ID);
  s.onload = () => { scriptLoaded = true; };
  document.head.appendChild(s);
}

export function initAdSense() {
  const consent = getConsent();
  if (consent.ads) ensureScript(consent);
  onConsent(ensureScript);
}

export function createResponsiveAd(containerSelector, slotId) {
  if (adsDisabled()) return;
  const el = typeof containerSelector === "string" ? document.querySelector(containerSelector) : containerSelector;
  if (!el) return;

  const ins = document.createElement("ins");
  ins.className = "adsbygoogle";
  ins.style.display = "block";
  ins.setAttribute("data-ad-client", CLIENT_ID);
  ins.setAttribute("data-ad-slot", slotId); // <-- REPLACE with your slot ID
  ins.setAttribute("data-ad-format", "auto");
  ins.setAttribute("data-full-width-responsive", "true");
  el.appendChild(ins);

  if (window.adsbygoogle) window.adsbygoogle.push({});
}

// Minimal styling helper (optional)
export function mountAdStyles(){
  if (document.getElementById("wl-ads-css")) return;
  const s = document.createElement("style");
  s.id = "wl-ads-css";
  s.textContent = `
    .adwrap { margin: 16px 0; border-radius: 12px; overflow: hidden;
      background: rgba(255,255,255,.04); box-shadow: 0 8px 24px rgba(0,0,0,.35); padding: 4px; }
  `;
  document.head.appendChild(s);
}
