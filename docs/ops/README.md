# 🧠 Whylee — Operational Overview & Release Summary (v8)

![Whylee Banner](/media/posters/whylee_promo.webp)

---

## 1. Executive Summary

**Whylee v8** is a production-ready, gamified brain-training web app optimised for both web (Netlify) and Android (via TWA).  
It introduces the **Pro ecosystem**, enhanced avatar system, cloud sync, theming engine, and fully automated deployment workflows.  
All game, authentication, and payment systems are now integrated and verified for live operation.

**Core platforms:**
- **Frontend:** PWA + Firebase + Netlify
- **Backend:** Firestore + Cloud Functions
- **Mobile:** Trusted Web Activity (Bubblewrap)
- **Monetisation:** Stripe (Web) + Google Play Billing (Android)
- **Analytics & Ads:** AdSense + UMP (Consent)
- **CI/CD:** Netlify deploy previews + Firebase Functions autodeploy

---

## 2. Gameplay Overview

### Level 1 – Quickfire Quiz
- Ten adaptive questions generated via `questionEngine.js`
- XP rewarded for speed and accuracy
- Streak bar (`streakBar.js`) animates progress
- Redemption mechanic removes 1 incorrect pip after 3 correct answers
- Failure condition: reaching 3 incorrect pips without redemption
- Poster feedback (`posterManager.js`) shows *Success* / *Game Over*

### Level 2 – Memory Match
- Introduces 5 matching pairs per round (previously 3)
- Adaptive speed timers and bonus animations
- Premium cinematic visuals and ambient audio effects
- Pro users receive higher XP multiplier and alternate reward sequence

### Pro Version Enhancements
- Access to all avatars: Fox, Owl, Panda, Cat, Wolf, Tiger, Dragon, Bear  
- Custom avatar + emoji for leaderboard identity
- Cloud Save (auto-sync profile, streaks, XP)
- Themes: Light, Dark, Aurora, Neon
- No ads + bonus reward sequences

---

## 3. Visual and Branding Assets

**Folders:**
