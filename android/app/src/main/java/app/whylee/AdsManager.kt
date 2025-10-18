package app.whylee

import android.app.Activity
import android.util.Log
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardItem
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

/**
 * AdsManager:
 * - Preload interstitial & rewarded
 * - Show on request
 * - Send AD_EVENT back to web (including rewards)
 */
object AdsManager {

    private var interstitial: InterstitialAd? = null
    private var rewarded: RewardedAd? = null

    // TODO: replace with your Ad Unit IDs
    private const val INTERSTITIAL_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ"
    private const val REWARDED_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW"

    fun init(activity: Activity) {
        MobileAds.initialize(activity) { }
        preloadInterstitial(activity)
        preloadRewarded(activity)
    }

    private fun preloadInterstitial(activity: Activity) {
        val req = AdRequest.Builder().build()
        InterstitialAd.load(activity, INTERSTITIAL_ID, req, object : InterstitialAdLoadCallback() {
            override fun onAdLoaded(ad: InterstitialAd) { interstitial = ad }
            override fun onAdFailedToLoad(err: com.google.android.gms.ads.LoadAdError) {
                Log.w("WhyleeAds", "Interstitial load failed: $err")
            }
        })
    }

    private fun preloadRewarded(activity: Activity) {
        val req = AdRequest.Builder().build()
        RewardedAd.load(activity, REWARDED_ID, req, object : RewardedAdLoadCallback() {
            override fun onAdLoaded(ad: RewardedAd) { rewarded = ad }
            override fun onAdFailedToLoad(err: com.google.android.gms.ads.LoadAdError) {
                Log.w("WhyleeAds", "Rewarded load failed: $err")
            }
        })
    }

    fun showInterstitial(placement: String) {
        val act = ActivityHolder.activity ?: return
        val ad = interstitial
        if (ad == null) { preloadInterstitial(act); return }
        ad.show(act)
        JsBridge.sendAdEvent(act, "INTERSTITIAL", "CLOSED")
        interstitial = null
        preloadInterstitial(act)
    }

    fun showRewarded(placement: String) {
        val act = ActivityHolder.activity ?: return
        val ad = rewarded
        if (ad == null) { preloadRewarded(act); return }
        ad.show(act) { reward: RewardItem ->
            JsBridge.sendAdEvent(act, "REWARDED", "REWARD_EARNED", reward.amount, reward.type)
        }
        JsBridge.sendAdEvent(act, "REWARDED", "CLOSED")
        rewarded = null
        preloadRewarded(act)
    }

    fun showBanner(placement: String) {
        // TWA doesn’t easily overlay native banners; prefer web banners via AdSense on marketing pages.
        // If you build a native banner container Activity/Fragment, wire it here and send visibility events via JsBridge.
        Log.d("WhyleeAds", "Banner not implemented in TWA; use web AdSense for marketing pages.")
    }
}
