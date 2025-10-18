# ========================
# Whylee TWA / Bubblewrap
# ========================
-keep class com.google.androidbrowserhelper.** { *; }
-dontwarn com.google.androidbrowserhelper.**

# ========================
# Google UMP (User Messaging Platform)
# ========================
-keep class com.google.android.ump.** { *; }
-dontwarn com.google.android.ump.**

# ========================
# Optional future integrations
# ========================

# Play Billing
# -keep class com.android.billingclient.** { *; }
# -dontwarn com.android.billingclient.**

# Google Mobile Ads SDK
# -keep class com.google.android.gms.ads.** { *; }
# -dontwarn com.google.android.gms.ads.**

# Firebase (if used)
# -keep class com.google.firebase.** { *; }
# -dontwarn com.google.firebase.**

# ========================
# Kotlin / AndroidX safe defaults
# ========================
-dontwarn org.jetbrains.annotations.**
-keepattributes *Annotation*, Signature
