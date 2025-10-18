package app.whylee

import android.os.Bundle
import com.google.androidbrowserhelper.trusted.LauncherActivity
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

class MainActivity : LauncherActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // UMP consent
        val params = ConsentRequestParameters.Builder()
            .setTagForUnderAgeOfConsent(false)
            .build()
        val consentInfo = UserMessagingPlatform.getConsentInformation(this)
        consentInfo.requestConsentInfoUpdate(
            this,
            params,
            {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(this) { /* ignore errors */ }
            },
            { /* ignore errors */ }
        )

        // Init managers
        AdsManager.init(this)
        BillingManager.init(this)

        // Bind bridge to TWA session
        JsBridge.bindToTwa(this)
    }

    override fun onStart() {
        super.onStart()
        ActivityHolder.activity = this
        BillingManager.setActivity(this)
    }

    override fun onStop() {
        if (ActivityHolder.activity === this) ActivityHolder.activity = null
        super.onStop()
    }
}
