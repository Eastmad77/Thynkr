# Netlify Summary — Whylee v8

## Build
- **Build command:** *(none)* — static site
- **Publish directory:** `.`

## Environment Variables (Site → Settings → Build & deploy → Environment)
| Key | Example |
|-----|---------|
| VITE_FIREBASE_API_KEY | AIza... |
| VITE_FIREBASE_AUTH_DOMAIN | yourapp.firebaseapp.com |
| VITE_FIREBASE_PROJECT_ID | yourapp |
| VITE_FIREBASE_STORAGE_BUCKET | yourapp.appspot.com |
| VITE_FIREBASE_MESSAGING_SENDER_ID | 1234567890 |
| VITE_FIREBASE_APP_ID | 1:123:web:abc... |
| VITE_FIREBASE_MEASUREMENT_ID | G-XXXXXXX |
| VITE_STRIPE_PUBLISHABLE_KEY | pk_live_... |
| STRIPE_PRICE_PRO_MONTHLY | price_XXXX |
| VITE_ADSENSE_CLIENT | ca-pub-XXXXXXXXXXXXX |
| VITE_ADSENSE_SLOT_FOOTER | 1234567892 |
| VITE_ENABLE_ADS | true |
| VITE_ENABLE_PLAY_BILLING | true |
| VITE_ENABLE_PRO_AVATARS | true |

> Functions secrets (Stripe/Play) are set in **Firebase Functions env**, not Netlify.

## Redirects / Function Proxies
Defined in `netlify.toml`:

