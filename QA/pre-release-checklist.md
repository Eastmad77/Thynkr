# Whylee v8 – Pre-release QA Checklist

## 0) Build & Config
- [ ] `.firebaserc` default project = `dailybrainbolt`
- [ ] `firebase.json` present; SPA rewrites enabled
- [ ] `firestore.rules` deployed (users self-access)
- [ ] `functions` deployed; endpoints live:
  - [ ] `/health` returns ok:true
  - [ ] `/createCheckoutSession` reachable
  - [ ] `/stripeWebhook` configured with signing secret
  - [ ] `/getDailyQuestions` returns payload or fallback
  - [ ] `/submitResults` accepts posts
- [ ] `manifest.webmanifest` includes icons + screenshots
- [ ] Service Worker present and not blocking auth (optional)

## 1) Auth & Cloud Sync
- [ ] Sign Up creates `users/{uid}` with default fields
- [ ] Sign In sets local storage and loads theme/avatar
- [ ] Reset password email is sent successfully
- [ ] Sign Out clears local cache and gates show correctly
- [ ] Firestore `users/{uid}` updates after profile changes

## 2) Profile & Theme
- [ ] Avatar selection persists across refresh
- [ ] Pro avatars show gate + link to `/pro.html` for Free users
- [ ] Theme select: system, light, dark, midnight (persists + respects OS)

## 3) Game / Engine
- [ ] `/game.html` loads 5 questions; timing increments
- [ ] Answering records correctness; Next/Finish behavior correct
- [ ] Finishing POSTs session (`submitResults`) and updates XP/level
- [ ] Adaptive difficulty path increases after 2 correct; decreases after a miss
- [ ] Engine fallback works when `/getDailyQuestions` is offline

## 4) Leaderboard & Achievements
- [ ] `/leaderboard.html` renders top users (by XP)
- [ ] Badge claiming demo (QA only) updates array and UI
- [ ] Achievements page shows Locked vs Unlocked states

## 5) Pro Flow (Stripe)
- [ ] `/pro.html` → Upgrade button opens Stripe Checkout
- [ ] On success, `/pro-success.html` loads; UI flips to Pro via optimistic update
- [ ] Webhook marks `proStatus: true` in Firestore within ~60s
- [ ] Pro-only gates show/hide as expected after webhook

## 6) PWA / TWA
- [ ] Install prompt appears (Chrome) and app launches standalone
- [ ] Icons (192/512) render crisp; theme color matches
- [ ] Orientation locked to portrait
- [ ] TWA check: Verified app links (assetlinks.json) correct (optional)

## 7) Accessibility & Performance
- [ ] Pages keyboard navigable; focus rings visible
- [ ] Contrast meets WCAG AA (dark backgrounds + text)
- [ ] LCP < 2.5s on broadband; total JS < 300KB (gzip) for core
- [ ] No console errors; network 200/304s only

## 8) Store Readiness
- [ ] Privacy/Terms/About updated and consistent
- [ ] Screenshots: 1080×1920 portrait prepared
- [ ] Feature graphic matches brand posters
- [ ] Short/Long descriptions match app value and Pro pitch
