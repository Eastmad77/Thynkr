# ✅ Post-Deploy Smoke & Rollback

Automated check runs every 6h: see **Actions → Post-Deploy Check**.

Manual smoke after deploy:
- `curl https://YOUR-SITE.netlify.app/health` → HTTP 200, `latencyMs < 500`
- Open `/game.html` → HUD + streak/pips animate
- Open `/pro.html` → Play purchase (Android) / Stripe checkout (web)
- Consent banner (EEA) → footer ad loads
- `/admin-monitor.html` shows logs & health

Rollback:
- Netlify → Deploys → “Publish previous deploy”
