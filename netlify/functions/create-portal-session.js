// netlify/functions/create-portal-session.js
// Creates a Stripe Billing Portal session so users can manage/cancel.
// Env: STRIPE_SECRET_KEY, SITE_URL, FIREBASE_SERVICE_ACCOUNT

import Stripe from 'stripe';
import { getAdmin } from './_shared/firebase-admin.mjs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { STRIPE_SECRET_KEY } = process.env;
    if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY missing');

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    const { uid } = JSON.parse(event.body || '{}');
    if (!uid) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing uid' }) };

    const { db } = getAdmin();
    if (!db) return { statusCode: 501, headers: CORS, body: JSON.stringify({ error: 'Admin not configured' }) };

    const snap = await db.collection('users').doc(uid).get();
    const data = snap.exists ? (snap.data() || {}) : {};
    const customerId = data?.stripeCustomerId;
    if (!customerId) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No Stripe customer on file' }) };

    const siteUrl = process.env.SITE_URL || (event.headers.origin ? event.headers.origin : `https://${event.headers.host}`);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: siteUrl,
    });

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error('[create-portal-session] error:', err);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Portal error' }) };
  }
}
