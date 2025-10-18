package app.whylee

import android.app.Activity
import android.util.Log
import com.android.billingclient.api.*

/**
 * BillingManager:
 * - Connects BillingClient
 * - Launches purchase for given SKU
 * - On success, calls JsBridge.sendPlayPurchaseResult(...)
 */
object BillingManager : PurchasesUpdatedListener {

    private var client: BillingClient? = null
    private var lastPurchaseUid: String? = null
    private var lastSku: String = "whylee_pro_monthly"

    fun init(activity: Activity) {
        client = BillingClient.newBuilder(activity)
            .setListener(this)
            .enablePendingPurchases()
            .build()

        client?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                Log.d("WhyleeBilling", "Setup: ${result.responseCode}")
            }
            override fun onBillingServiceDisconnected() {
                Log.w("WhyleeBilling", "Service disconnected")
            }
        })
    }

    fun startPurchase(sku: String, uid: String) {
        val c = client ?: return
        lastSku = sku
        lastPurchaseUid = uid

        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductId(sku) // For legacy, use SkuDetails; for modern Play, use ProductDetails query.
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                )
            )
            .build()

        // NOTE: For production you must query ProductDetails via queryProductDetailsAsync
        // and pass the returned ProductDetails, not raw sku. This simplified snippet is illustrative.
        val res = c.launchBillingFlow(currentActivity(), params)
        Log.d("WhyleeBilling", "Launch flow: ${res.responseCode}")
    }

    private fun currentActivity(): Activity {
        // In LauncherActivity context, we can use a static ref or pass activity around; for simplicity:
        // If needed, refactor to store a weakRef from MainActivity.onCreate
        return ActivityHolder.activity ?: throw IllegalStateException("No activity")
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        if (result.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (p in purchases) {
                val token = p.purchaseToken
                val uid = lastPurchaseUid ?: ""
                val sku = lastSku
                // Acknowledge if needed
                acknowledge(p)
                // Notify PWA
                ActivityHolder.activity?.let { JsBridge.sendPlayPurchaseResult(it, sku, uid, token) }
            }
        } else if (result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            Log.d("WhyleeBilling", "User canceled purchase.")
        } else {
            Log.w("WhyleeBilling", "Purchase failed: ${result.responseCode} ${result.debugMessage}")
        }
    }

    private fun acknowledge(purchase: Purchase) {
        try {
            val c = client ?: return
            if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged) {
                val params = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.purchaseToken)
                    .build()
                c.acknowledgePurchase(params) { br ->
                    Log.d("WhyleeBilling", "Acknowledge: ${br.responseCode}")
                }
            }
        } catch (t: Throwable) {
            Log.e("WhyleeBilling", "Ack error", t)
        }
    }
}

/** Holds a ref to the foreground activity for convenience */
object ActivityHolder {
    var activity: Activity? = null
}
