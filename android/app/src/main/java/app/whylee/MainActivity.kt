package app.whylee

import android.os.Bundle
import com.google.androidbrowserhelper.trusted.LauncherActivity
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

class MainActivity : LauncherActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // --- Google Consent Form (for GDPR/EEA users) ---
        val params = ConsentRequestParameters.Builder()
            .setTagForUnderAgeOfConsent(false)
            .build()

        val consentInfo = UserMessagingPlatform.getConsentInformation(this)
        consentInfo.requestConsentInfoUpdate(
            this,
            params,
            {
                // Attempt to show consent form if required
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(this) { _ ->
                    // If the form is shown, the callback fires when it’s dismissed
                }
            },
            { _ ->
                // Failed to load consent info, proceed silently
            }
        )

        // --- Initialize Ads, Billing, and JS Bridge ---
        AdsManager.init(this)
        BillingManager.init(this)
        JsBridge.bindToTwa(this)
    }

    // --- Track activity lifecycle for billing & ads ---
    override fun onStart() {
        super.onStart()
        ActivityHolder.activity = this
        BillingManager.setActivity(this)
    }

    override fun onStop() {
        super.onStop()
        if (ActivityHolder.activity === this) {
            ActivityHolder.activity = null
        }
    }
}
