package app.whylee

import android.app.Activity
import android.util.Log
import com.google.android.gms.ads.*

object AdsManager {
    private var interstitial: com.google.android.gms.ads.interstitial.InterstitialAd? = null
    private var rewarded: com.google.android.gms.ads.rewarded.RewardedAd? = null

    private const val INTERSTITIAL_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ" // TODO
    private const val REWARDED_ID = "ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW"    // TODO

    fun init(activity: Activity) {
        MobileAds.initialize(activity) { }
        preloadInterstitial(activity)
        preloadRewarded(activity)
    }
    private fun preloadInterstitial(activity: Activity) {
        InterstitialAd.load(activity, INTERSTITIAL_ID, AdRequest.Builder().build(),
            object : com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: com.google.android.gms.ads.interstitial.InterstitialAd) { interstitial = ad }
                override fun onAdFailedToLoad(err: LoadAdError) { Log.w("WhyleeAds","Interstitial load failed: $err") }
            })
    }
    private fun preloadRewarded(activity: Activity) {
        com.google.android.gms.ads.rewarded.RewardedAd.load(activity, REWARDED_ID, AdRequest.Builder().build(),
            object : com.google.android.gms.ads.rewarded.RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: com.google.android.gms.ads.rewarded.RewardedAd) { rewarded = ad }
                override fun onAdFailedToLoad(err: LoadAdError) { Log.w("WhyleeAds","Rewarded load failed: $err") }
            })
    }
    fun showInterstitial(placement: String) {
        val act = ActivityHolder.activity ?: return
        val ad = interstitial ?: return preloadInterstitial(act)
        ad.show(act)
        JsBridge.sendAdEvent(act, "INTERSTITIAL", "CLOSED")
        interstitial = null; preloadInterstitial(act)
    }
    fun showRewarded(placement: String) {
        val act = ActivityHolder.activity ?: return
        val ad = rewarded ?: return preloadRewarded(act)
        ad.show(act) { reward -> JsBridge.sendAdEvent(act, "REWARDED", "REWARD_EARNED", reward.amount, reward.type) }
        JsBridge.sendAdEvent(act, "REWARDED", "CLOSED")
        rewarded = null; preloadRewarded(act)
    }
    fun showBanner(placement: String) {
        Log.d("WhyleeAds","Banner not implemented in TWA; use web AdSense on marketing pages.")
    }
}
