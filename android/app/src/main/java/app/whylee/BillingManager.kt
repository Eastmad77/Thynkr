package app.whylee

import android.app.Activity
import android.util.Log
import com.android.billingclient.api.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.lang.ref.WeakReference

/**
 * Whylee BillingManager (Production-grade)
 * - Connects BillingClient
 * - Queries ProductDetails for subscriptions
 * - Launches purchase flow
 * - Acknowledges purchases
 * - Sends results back to PWA via JsBridge.sendPlayPurchaseResult(...)
 *
 * Web contract (already in your PWA):
 *   startPlayPurchase({ uid, sku: "whylee_pro_monthly" })
 */
object BillingManager : PurchasesUpdatedListener {

    private const val TAG = "WhyleeBilling"

    private var client: BillingClient? = null
    private var activityRef = WeakReference<Activity>(null)

    private var lastPurchaseUid: String? = null
    private var lastSku: String = "whylee_pro_monthly"

    // Cache of ProductDetails by productId
    private val products = mutableMapOf<String, ProductDetails>()

    fun init(activity: Activity) {
        activityRef = WeakReference(activity)
        if (client != null) return

        client = BillingClient.newBuilder(activity)
            .setListener(this)
            .enablePendingPurchases()
            .build()

        client?.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                Log.d(TAG, "Setup: ${result.responseCode} ${result.debugMessage}")
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    // Preload details for common SKUs
                    preloadProductDetails(listOf("whylee_pro_monthly"))
                }
            }
            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "Service disconnected")
            }
        })
    }

    fun setActivity(activity: Activity?) { activityRef = WeakReference(activity) }

    fun startPurchase(sku: String, uid: String) {
        val act = activityRef.get() ?: return
        val c = client ?: return
        lastSku = sku
        lastPurchaseUid = uid

        // Ensure ProductDetails is ready
        CoroutineScope(Dispatchers.Main).launch {
            val pd = products[sku] ?: querySingleProduct(sku)
            if (pd == null) {
                Log.w(TAG, "No ProductDetails for $sku")
                return@launch
            }

            // Pick base plan / offer token (simple case: first subscription offer)
            val subOffer = pd.subscriptionOfferDetails?.firstOrNull()
            val offerToken = subOffer?.offerToken
            val productParam = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(pd)
                .apply {
                    if (offerToken != null) setOfferToken(offerToken)
                }
                .build()

            val params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(listOf(productParam))
                .build()

            val res = c.launchBillingFlow(act, params)
            Log.d(TAG, "launchBillingFlow: ${res.responseCode} ${res.debugMessage}")
        }
    }

    private fun preloadProductDetails(productIds: List<String>) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val list = productIds.map {
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(it)
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                }
                val params = QueryProductDetailsParams.newBuilder()
                    .setProductList(list)
                    .build()
                val c = client ?: return@launch
                val res = c.queryProductDetails(params)
                res.productDetailsList?.forEach { pd -> products[pd.productId] = pd }
                Log.d(TAG, "Preloaded ProductDetails: ${products.keys}")
            } catch (t: Throwable) {
                Log.e(TAG, "preloadProductDetails error", t)
            }
        }
    }

    private suspend fun querySingleProduct(productId: String): ProductDetails? {
        return try {
            val p = QueryProductDetailsParams.newBuilder()
                .setProductList(
                    listOf(
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(productId)
                            .setProductType(BillingClient.ProductType.SUBS)
                            .build()
                    )
                ).build()
            val c = client ?: return null
            val res = c.queryProductDetails(p)
            val pd = res.productDetailsList?.firstOrNull()
            if (pd != null) products[pd.productId] = pd
            pd
        } catch (t: Throwable) {
            Log.e(TAG, "querySingleProduct error", t)
            null
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        if (result.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (p in purchases) handlePurchase(p)
        } else if (result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            Log.d(TAG, "User canceled purchase.")
        } else {
            Log.w(TAG, "onPurchasesUpdated: ${result.responseCode} ${result.debugMessage}")
        }
    }

    private fun handlePurchase(purchase: Purchase) {
        // Acknowledge + send to PWA
        acknowledgeIfNeeded(purchase)
        val token = purchase.purchaseToken
        val uid = lastPurchaseUid ?: ""
        val sku = lastSku
        activityRef.get()?.let { JsBridge.sendPlayPurchaseResult(it, sku, uid, token) }
    }

    private fun acknowledgeIfNeeded(purchase: Purchase) {
        try {
            val c = client ?: return
            if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED && !purchase.isAcknowledged) {
                val params = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.purchaseToken)
                    .build()
                c.acknowledgePurchase(params) { br ->
                    Log.d(TAG, "Acknowledge: ${br.responseCode} ${br.debugMessage}")
                }
            }
        } catch (t: Throwable) {
            Log.e(TAG, "acknowledgeIfNeeded error", t)
        }
    }
}
