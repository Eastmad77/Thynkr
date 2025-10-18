package app.whylee

import android.app.Activity
import android.util.Log
import androidx.browser.customtabs.CustomTabsSession
import com.google.androidbrowserhelper.trusted.TwaLauncher
import org.json.JSONObject

/**
 * JsBridge: Handles postMessage between PWA and native.
 * Web → Native:
 *   { type:"PLAY_PURCHASE", sku, uid }
 *   { type:"AD_REQUEST", format:"INTERSTITIAL"|"REWARDED"|"BANNER", placement }
 *
 * Native → Web:
 *   { type:"PLAY_PURCHASE_RESULT", sku, uid, purchaseToken }
 *   { type:"AD_EVENT", format, status, reward? }
 */
object JsBridge {

    private var session: CustomTabsSession? = null

    fun bindToTwa(activity: Activity) {
        // TwaLauncher can provide the current CustomTabsSession used by the TWA
        val launcher = TwaLauncher(activity)
        session = launcher.session
        // If session is null here, Bubblewrap may set it later; Ads/Billing managers can still function.
    }

    fun onWebMessage(json: String) {
        try {
            val data = JSONObject(json)
            when (data.optString("type")) {
                "PLAY_PURCHASE" -> {
                    val sku = data.optString("sku", "whylee_pro_monthly")
                    val uid = data.optString("uid")
                    BillingManager.startPurchase(sku, uid)
                }
                "AD_REQUEST" -> {
                    val format = data.optString("format")
                    val placement = data.optString("placement", "default")
                    when (format.uppercase()) {
                        "INTERSTITIAL" -> AdsManager.showInterstitial(placement)
                        "REWARDED" -> AdsManager.showRewarded(placement)
                        "BANNER" -> AdsManager.showBanner(placement)
                    }
                }
                else -> Log.w("WhyleeBridge", "Unknown message from web: $json")
            }
        } catch (t: Throwable) {
            Log.e("WhyleeBridge", "Bad web message: $json", t)
        }
    }

    fun postToWeb(activity: Activity, payload: JSONObject) {
        try {
            // Send a postMessage to the TWA; requires relationship established via assetlinks.json
            val s = session ?: return
            val text = payload.toString()
            // Using androidbrowserhelper’s utilities, the session can send postMessage:
            // NOTE: Bubblewrap config must enable postMessage and domain must have assetlinks.json
            s.postMessage(text, null)
        } catch (t: Throwable) {
            Log.e("WhyleeBridge", "postToWeb error", t)
        }
    }

    // Convenience helpers:
    fun sendPlayPurchaseResult(activity: Activity, sku: String, uid: String, token: String) {
        val obj = JSONObject()
            .put("type", "PLAY_PURCHASE_RESULT")
            .put("sku", sku)
            .put("uid", uid)
            .put("purchaseToken", token)
        postToWeb(activity, obj)
    }

    fun sendAdEvent(activity: Activity, format: String, status: String, rewardAmount: Int? = null, rewardType: String? = null) {
        val obj = JSONObject()
            .put("type", "AD_EVENT")
            .put("format", format)
            .put("status", status)
        if (rewardAmount != null) obj.put("reward", JSONObject().put("amount", rewardAmount).put("type", rewardType ?: "xp"))
        postToWeb(activity, obj)
    }
}
