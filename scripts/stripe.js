// scripts/stripe.js — v7000
import { Entitlements } from './entitlements.js';

// Set this key in Netlify env and expose via HTML <script> tag or window.WHYLEE_STRIPE_PK
// Example: <script>window.WHYLEE_STRIPE_PK="pk_live_xxx";</script>
const STRIPE_PK = window.WHYLEE_STRIPE_PK || 'pk_test_REPLACE_ME';

export async function startStripeCheckout() {
  if (!STRIPE_PK) {
    alert('Stripe key missing. Please configure WHYLEE_STRIPE_PK.');
    return;
  }
  try {
    const stripe = await loadStripe();
    const session = await createCheckoutSession();
    const { error } = await stripe.redirectToCheckout({ sessionId: session.id });
    if (error) console.error('[Stripe] redirect error', error);
  } catch (e) {
    console.error('[Stripe] init error', e);
  }
}

// Mock server call — In production, call your Netlify Function to create sessions
async function createCheckoutSession() {
  // TODO: replace with real endpoint that returns { id: 'cs_test_...' }
  return { id: 'DUMMY_SESSION_ID' };
}

async function loadStripe() {
  if (window.Stripe) return window.Stripe(STRIPE_PK);
  await new Promise(res => {
    const s = document.createElement('script');
    s.src = 'https://js.stripe.com/v3/';
    s.onload = res;
    document.head.appendChild(s);
  });
  return window.Stripe(STRIPE_PK);
}

// Confirmation hook — call from your success page/return_url
export function onStripeSuccess() {
  Entitlements.grantPro();
}
