# Whylee — Daily Brain Bolt (PWA)

A cinematic brain-training PWA deployed on Netlify with autonomous daily content via Firebase/Firestore.

## 🌟 Features
- 3 daily levels: Warm-up (MCQ), Matching Pairs, Trivia/Logic
- Offline-ready PWA with service worker + update toast
- XP, streaks, badges, reflections
- Free (ad-supported) + Pro (ad-free, bonus level, leaderboard)
- Netlify Function generates new content daily (cron) → Firestore

---

## 🔐 Environment Variables (Netlify)
Set these in **Netlify → Site settings → Build & deploy → Environment**:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (escape newlines as `\n`)
- *(Optional for Stripe)* `WHYLEE_STRIPE_PK` (or inject via `<script>`)

> **Never commit secrets** to the repo.

---

## 🔄 Autonomous Daily Questions
- Function: **`/netlify/functions/generateDailyQuestions.js`**
- Scheduled via **`netlify.toml`** (daily cron)
- Writes Firestore doc: **`daily_questions/{YYYY-MM-DD}`**
- Payload includes:
  - `levels[]` (with `type: "mcq" | "pairs"`)
  - `adPoster` for sponsor rotation

---

## 💸 Monetization
- **AdSense** banners: add the global script in page `<head>` with your publisher ID.
- **Sponsor posters**: displayed between Level 2 → 3 from `/media/posters/v1/*`.
- **Pro upgrade**: Stripe or Play Billing. 3-day trial via `entitlements.js`.

**Ads compliance**
- Root **`/ads.txt`** present and includes your publisher ID.
- Update **privacy** page to mention AdSense and link to Google Ad Settings.

---

## 🧭 Local Dev
```bash
# from project root
npx serve    # or any static server
