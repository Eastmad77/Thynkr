/**
 * Whylee AdMob Bridge (Android Native wrapper required)
 * JS <-> Native postMessage protocol
 *
 * Web calls showInterstitial()/showRewarded(), native shows the ad and
 * replies with POST_MESSAGE events: AD_EVENT with {type, format, status, reward?}
 */

const ANDROID = {
  post(msg) {
    const s = JSON.stringify(msg);
    if (window.AndroidAds?.postMessage) window.AndroidAds.postMessage(s);
    else if (window.ReactNativeWebView?.postMessage) window.ReactNativeWebView.postMessage(s);
    else console.warn("[AdMob] Native bridge not available.");
  }
};

let rewardListener = null;

export function showInterstitial({ placement = "menu_nav", capMs = 90_000 } = {}) {
  if (!canShow("interstitial", capMs)) return;
  ANDROID.post({ type: "AD_REQUEST", format: "INTERSTITIAL", placement });
  stamp("interstitial");
}

export function showRewarded({ placement = "bonus_xp", capMs = 180_000, onReward } = {}) {
  if (!canShow("rewarded", capMs)) return;
  rewardListener = typeof onReward === "function" ? onReward : null;
  ANDROID.post({ type: "AD_REQUEST", format: "REWARDED", placement });
  stamp("rewarded");
}

export function showBanner({ placement = "footer" } = {}) {
  ANDROID.post({ type: "AD_REQUEST", format: "BANNER", placement });
}

// Frequency cap (very simple)
const lastShown = {};
function stamp(kind) { lastShown[kind] = Date.now(); }
function canShow(kind, capMs) {
  const last = lastShown[kind] || 0;
  return Date.now() - last > capMs;
}

// Listen for rewards & lifecycle events from native
window.addEventListener("message", (ev) => {
  let data; try { data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data; } catch { return; }
  if (data?.type !== "AD_EVENT") return;
  const { format, status, reward } = data;
  if (format === "REWARDED" && status === "REWARD_EARNED" && rewardListener) {
    try { rewardListener(reward || { amount: 1, type: "coins" }); } catch {}
    rewardListener = null;
  }
});
