// netlify/functions/stripe-webhook.cjs
// Stripe → Firestore entitlement updates (CommonJS to avoid ESM "exports" warning).
// Env: STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY, FIREBASE_SERVICE_ACCOUNT (b64 or raw JSON)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

let _app;
function ensureAdmin() {
  if (_app) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT missing');
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const creds = JSON.parse(json);
  _app = admin.apps?.length ? admin.app() : admin.initializeApp({
    credential: admin.credential.cert(creds),
    projectId: process.env.FIREBASE_PROJECT_ID || creds.project_id,
  });
  return admin;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let evt;

  try {
    evt = stripe.webhooks.constructEvent(event.body, sig, secret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    const adminSDK = ensureAdmin();
    const db = adminSDK.firestore();
    const now = adminSDK.firestore.FieldValue.serverTimestamp();

    async function setPlan(session, planName) {
      const uid = session.metadata?.uid || '';
      const email = session.customer_details?.email || session.customer_email || '';
      const customerId = session.customer || '';

      let ref;
      if (uid) ref = db.collection('users').doc(uid);
      else if (email) ref = db.collection('users').doc(`email:${email.toLowerCase()}`);
      else ref = db.collection('users').doc(`stripe:${customerId}`);

      await ref.set(
        { plan: planName, pro: planName.startsWith('pro'), stripeCustomerId: customerId, updatedAt: now },
        { merge: true }
      );
    }

    switch (evt.type) {
      case 'checkout.session.completed': {
        const s = evt.data.object;
        const planMeta = (s.metadata?.plan || '').toLowerCase(); // 'monthly' | 'yearly'
        const planName = planMeta === 'yearly' ? 'pro_yearly' : 'pro_monthly';
        await setPlan(s, planName);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = evt.data.object;
        const customerId = sub.customer;
        const q = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (!q.empty) {
          await q.docs[0].ref.set({ plan: 'free', pro: false, updatedAt: now }, { merge: true });
        }
        break;
      }
      default:
        // ignore
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
