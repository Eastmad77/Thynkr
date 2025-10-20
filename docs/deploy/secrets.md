# Secrets & Env – Netlify

## Required env (Site settings → Build & deploy → Environment)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY  (escape newlines: `\n`)

## Optional
- LEADERBOARD_COLLECTION (default: leaderboard)
- LEADERBOARD_LIMIT (default: 100)
- SECRETS_SCAN_SMART_DETECTION_ENABLED=true
- SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES=FIREBASE_API_KEY,FIREBASE_PROJECT_ID,FIREBASE_AUTH_DOMAIN

## Never commit secrets
- Service account JSONs
- Private keys (`-----BEGIN PRIVATE KEY-----`)
- Stripe `sk_...` keys

## Rotate keys
If any secret was committed at any point, rotate it and update Netlify env.
