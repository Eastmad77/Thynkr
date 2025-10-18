# ========================
# Whylee TWA / Bubblewrap
# ========================
-keep class com.google.androidbrowserhelper.** { *; }
-dontwarn com.google.androidbrowserhelper.**

# ========================
# Google UMP (Consent)
# ========================
-keep class com.google.android.ump.** { *; }
-dontwarn com.google.android.ump.**

# ========================
# Billing & AdMob (NEW)
# ========================
-keep class com.android.billingclient.** { *; }
-dontwarn com.android.billingclient.**
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# ========================
# Keep your glue classes (bridge/managers)
# ========================
-keep class app.whylee.** { *; }
-dontwarn app.whylee.**

# ========================
# Kotlin / AndroidX safe defaults
# ========================
-dontwarn org.jetbrains.annotations.**
-keepattributes *Annotation*, Signature
