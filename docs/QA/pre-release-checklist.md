# Whylee – Pre-Release QA Checklist (Android TWA + Web v1.0)

**Scope:** PWA (Netlify/Firebase Hosting), Android TWA (Bubblewrap), Functions (Stripe + Play verification), Firestore rules.

## 0) Test accounts & flags
- [ ] Firebase project: **production** selected in `.firebaserc`
- [ ] Test Google accounts added to **Play Console › Internal testing**
- [ ] Stripe test mode account + **test cards**
- [ ] Feature flags in `/scripts/config/remoteFlags.js` (if present) set to: `enableAds=true`, `enablePlayBilling=true`, `enableProAvatars=true`

## 1) Web app sanity
- [ ] All pages load with versioned CSS/JS (`?v=9003` or later)
- [ ] Dark/Light theme toggles work and persist
- [ ] Storyboard page reachable: `/promo/storyboard/storyboard-grid.html`
- [ ] Posters/splash screens display with fade/blur transitions (posterManager)

## 2) Auth & Profile
- [ ] Email/Password signin works
- [ ] Password reset flow sends email and confirms in UI
- [ ] Avatar pickers show **Free + Pro** sets (Pro gated)
- [ ] Emoji mini-icon selection persists to `users/{uid}`

## 3) Gameplay
- [ ] Level 1: Quickfire Quiz – streak bar animates, pips: ✅/❌, redemption rule:
      after **3 consecutive correct**, one ❌ pip is removed
- [ ] Level 2: Memory Match – 5 pairs, timer + scoring, parallax cards
- [ ] HUD shows AvatarBadge, XP, Timer
- [ ] Posters display on **Success/GameOver/Night** with Pro variants for Pro users

## 4) Payments – Stripe (Web)
- [ ] `/createCheckoutSession` returns session and redirects to Stripe Checkout
- [ ] On success, `users/{uid}.pro = true` within 30s (webhook)
- [ ] Cancel returns user to `/pro.html` without entitlement
- [ ] Refund test -> entitlement removed (webhook)

## 5) Payments – Google Play (Android)
- [ ] In app: tap **Buy on Android (Play)** → native purchase sheet opens
- [ ] After purchase, **Functions `/linkPurchaseToken`** receives token
- [ ] RTDN test message updates `receipts/{token}` and flips `users/{uid}.pro = true`
- [ ] Expired/canceled state eventually flips to false (RTDN & `entitlementCleanup`)

## 6) Ads & Consent
- [ ] **Consent banner** shows for EEA; actions persist preference
- [ ] AdSense script loads only after consent; ads render in marketing pages
- [ ] AdMob ads show in native (interstitial/rewarded) with **test IDs**
- [ ] Rewarded callback grants XP bonus (from `AD_EVENT`)

## 7) Security
- [ ] `firestore.rules` deny writes to `/receipts`, `/purchaseLinks`
- [ ] User can only read/write own `/users/{uid}`
- [ ] CORS ok on Functions; OPTIONS handled
- [ ] Asset links file matches **release keystore fingerprint**

## 8) Android Build
- [ ] UMP consent form auto-shows in EEA emulator
- [ ] App ID & Package ID correct in Bubblewrap config
- [ ] Signed AAB built; uploaded to **Internal test track**
- [ ] Splash/launcher icons match brand

## 9) Store Listing Pack
- [ ] Feature graphic 1024×500 (PNG), Screenshots (min 3, up to 8), Short + Full desc
- [ ] Data Safety form answered (see `/docs/store/data-safety-questionnaire.md`)
- [ ] Privacy Policy URL reachable and current
- [ ] Content rating completed

## 10) Smoke on Real Device
- [ ] Install from Internal test; launch/join flow ok on cold start
- [ ] Network offline behavior shows offline notice
- [ ] Animations respect `prefers-reduced-motion`
