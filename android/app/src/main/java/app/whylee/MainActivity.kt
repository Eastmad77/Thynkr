package app.whylee

import android.os.Bundle
import android.util.Log
import com.google.androidbrowserhelper.trusted.LauncherActivity

// UMP (Consent) imports
import com.google.android.ump.ConsentInformation
import com.google.android.ump.ConsentRequestParameters
import com.google.android.ump.UserMessagingPlatform

/**
 * Whylee TWA LauncherActivity with Google UMP (consent) flow.
 * This is the entry point when the TWA app is launched.
 *
 * Notes:
 * - Bubblewrap generates a LauncherActivity; we extend it and hook UMP inside onCreate.
 * - The consent dialog will auto-display if required (EEA/etc.). Otherwise it no-ops quickly.
 * - We do not block the TWA launch; UMP runs immediately and shows a form only if needed.
 */
class MainActivity : LauncherActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ---------- UMP (User Messaging Platform) Consent ----------
        // If your app is not directed to children, setTagForUnderAgeOfConsent(false).
        val params = ConsentRequestParameters
            .Builder()
            .setTagForUnderAgeOfConsent(false)
            .build()

        val consentInfo = UserMessagingPlatform.getConsentInformation(this)

        // Request the consent info update; if a form is required, show it.
        consentInfo.requestConsentInfoUpdate(
            this,
            params,
            {
                // On success, attempt to load and show the form if required.
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                    this
                ) { formError ->
                    // formError will be non-null if form failed to load/show; this is not fatal.
                    if (formError != null) {
                        Log.w("WhyleeUMP", "Consent form load/show error: ${formError.errorCode} ${formError.message}")
                    } else {
                        Log.d("WhyleeUMP", "Consent form handled (if required).")
                    }
                    // Continue normal app flow; TWA will launch as usual.
                }
            },
            { requestError ->
                // If the consent info request fails, log and continue. The app should still run.
                Log.w("WhyleeUMP", "Consent info update failed: ${requestError.errorCode} ${requestError.message}")
            }
        )

        // NOTE:
        // We do not block the TWA here—the TWA launch continues normally.
        // If the user is in an EEA context and consent is required, the form
        // will appear overlayed. Otherwise, nothing is shown.
    }
}
