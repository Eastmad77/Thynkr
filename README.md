# Whylee — Daily Brain Training (v7006)

Dark, cinematic PWA with Free + Pro tiers, autonomous daily questions, and a global leaderboard.

## New: Avatar Overlays + Leaderboard

### Files
- `/styles/avatar.css` — avatar base + progress ring
- `/styles/avatar-badge.css` — crown/star/lightning animations
- `/scripts/ui/avatar.js` — render logic (tier, progress, badges)
- `/profile.html` — profile screen example
- `/leaderboard.html` — responsive grid, fetches data
- `/data/leaderboard.json` — static data (dev)
- `/netlify/functions/fetchLeaderboard.js` — Firestore function (prod)
- `/service-worker.js` — cache bumped to `v7006`

### Usage
Add to your HTML:
```html
<link rel="stylesheet" href="/styles/avatar.css?v=7005" />
<link rel="stylesheet" href="/styles/avatar-badge.css?v=7006" />
<script type="module" src="/scripts/ui/avatar.js?v=7006"></script>
