package app.whylee

import android.os.Bundle
import android.util.Log
import com.google.androidbrowserhelper.trusted.LauncherActivity

// UMP (Consent)
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

class MainActivity : LauncherActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ---------- UMP Consent ----------
        val params = ConsentRequestParameters
            .Builder()
            .setTagForUnderAgeOfConsent(false)
            .build()

        val consentInfo = UserMessagingPlatform.getConsentInformation(this)
        consentInfo.requestConsentInfoUpdate(
            this,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(this) { formError ->
                    if (formError != null) {
                        Log.w("WhyleeUMP", "Consent form error: ${formError.errorCode} ${formError.message}")
                    } else {
                        Log.d("WhyleeUMP", "Consent handled (if required).")
                    }
                }
            },
            { requestError ->
                Log.w("WhyleeUMP", "Consent info update failed: ${requestError.errorCode} ${requestError.message}")
            }
        )

        // ---------- Init native managers ----------
        AdsManager.init(this)      // Mobile Ads SDK
        BillingManager.init(this)  // Play Billing client

        // ---------- PostMessage Bridge ----------
        // The bridge registers a channel with the current TWA custom tab session
        JsBridge.bindToTwa(this)
    }
}
