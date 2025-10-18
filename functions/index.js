/**
 * Whylee Functions — Payments & Entitlements (Option A Hybrid)
 * - Stripe Checkout + Webhook → users/{uid}.pro + entitlements/{uid}
 * - Play Billing RTDN (Pub/Sub) → verify & upsert entitlement
 * - Schedulers: daily content seed, entitlement cleanup
 */
import * as functions from "firebase-functions";
import admin from "firebase-admin";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { PubSub } from "@google-cloud/pubsub";
import { google } from "googleapis";

admin.initializeApp();
const db = admin.firestore();

// ---------- ENV ----------
const STRIPE_SECRET = process.env.STRIPE_SECRET;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PLAY_PACKAGE_NAME = process.env.PLAY_PACKAGE_NAME; // e.g. "app.whylee"
const GOOGLE_PLAY_SERVICE_ACCOUNT = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT || ""; // JSON string or GCLOUD default creds
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET) : null;

// ---------- Helpers ----------
async function setPro(uid, active, source, meta = {}) {
  const uref = db.doc(`users/${uid}`);
  const eref = db.doc(`entitlements/${uid}`);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const uSnap = await tx.get(uref);
    if (!uSnap.exists) tx.set(uref, { createdAt: now });

    tx.set(
      uref,
      { pro: !!active, proUpdatedAt: now, proSource: source, ...meta.user },
      { merge: true }
    );

    tx.set(
      eref,
      { active: !!active, source, updatedAt: now, ...meta.entitlement },
      { merge: true }
    );
  });
}

function getUidFromMetadata(obj) {
  // We always store uid in Checkout Session / Subscription metadata
  return obj?.metadata?.uid || obj?.data?.object?.metadata?.uid || null;
}

// ---------- HTTPS: Stripe create Checkout Session ----------
export const createCheckoutSession = functions.https.onRequest(async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe not configured" });
  res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.set("Access-Control-Allow-Headers", "content-type, authorization");
  if (req.method === "OPTIONS") return res.status(204).send("");

  try {
    const { uid, priceId, successUrl, cancelUrl } = req.body || {};
    if (!uid || !priceId) return res.status(400).json({ error: "Missing uid/priceId" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${req.headers.origin}/pro-success.html`,
      cancel_url: cancelUrl || `${req.headers.origin}/pro.html`,
      metadata: { uid }
    });

    res.json({ id: session.id, url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Stripe error" });
  }
});

// ---------- HTTPS: Stripe Webhook ----------
const stripeApp = express();
stripeApp.use(cors({ origin: true }));
stripeApp.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) return res.status(500).send("Stripe not configured");

  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const sess = event.data.object;
        const uid = getUidFromMetadata(sess);
        if (uid) await setPro(uid, true, "stripe", { entitlement: { product: "pro" } });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object;
        const uid = getUidFromMetadata(sub);
        const active = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
        if (uid) await setPro(uid, active, "stripe", { entitlement: { product: sub.items?.data?.[0]?.price?.product || "pro" } });
        break;
      }
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const obj = event.data.object;
        const uid = getUidFromMetadata(obj);
        if (uid) await setPro(uid, false, "stripe");
        break;
      }
      default:
        // ignore others
        break;
    }
    res.status(200).send("[ok]");
  } catch (e) {
    console.error(e);
    res.status(500).send("Webhook handler error");
  }
});
export const stripeWebhook = functions.https.onRequest(stripeApp);

// ---------- Pub/Sub: Google Play RTDN ----------
/**
 * Subscribe this function to your RTDN topic in Play Console.
 * Env required: PLAY_PACKAGE_NAME + service account with Android Publisher role.
 */
export const playBillingRtdn = functions.pubsub.topic("play-billing").onPublish(async (msg) => {
  try {
    const data = msg.json || JSON.parse(Buffer.from(msg.data, "base64").toString());
    // RTDN payload has purchaseToken, sku/productId, packageName, eventTimeMillis, etc.
    const { purchaseToken, sku, packageName } = data?.subscriptionNotification || data?.oneTimeProductNotification || {};

    if (!purchaseToken || (packageName && packageName !== PLAY_PACKAGE_NAME)) {
      console.log("Ignoring message", data);
      return;
    }

    // Verify with Google Play Developer API
    const auth = GOOGLE_PLAY_SERVICE_ACCOUNT
      ? new google.auth.GoogleAuth({ credentials: JSON.parse(GOOGLE_PLAY_SERVICE_ACCOUNT), scopes: ["https://www.googleapis.com/auth/androidpublisher"] })
      : new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/androidpublisher"] });

    const androidpublisher = google.androidpublisher({ version: "v3", auth });

    // NOTE: If using subscriptions:
    // const ver = await androidpublisher.purchases.subscriptionsv2.get({ packageName: PLAY_PACKAGE_NAME, token: purchaseToken });
    // For one-time products:
    // const ver = await androidpublisher.purchases.products.get({ packageName: PLAY_PACKAGE_NAME, productId: sku, token: purchaseToken });

    // For sample implementation we’ll mark as active and store a receipt (replace with real verification above).
    const receiptRef = db.collection("receipts").doc(purchaseToken);
    await receiptRef.set({
      source: "google-play",
      sku: sku || "pro",
      active: true,
      packageName: PLAY_PACKAGE_NAME,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // You must map a purchase to a user. Use Play Sign-In or
    // a bridge from the TWA (postMessage) to supply uid at purchase time and
    // store purchaseToken->uid mapping.
    const linkSnap = await db.collection("purchaseLinks").doc(purchaseToken).get();
    const uid = linkSnap.exists ? linkSnap.data().uid : null;
    if (uid) await setPro(uid, true, "google-play", { entitlement: { product: sku || "pro" } });
  } catch (e) {
    console.error("RTDN error", e);
  }
});

// ---------- Schedulers ----------
export const dailySeed = functions.pubsub.schedule("every day 02:00").timeZone("Etc/UTC").onRun(async () => {
  // lightweight example
  const ref = db.collection("daily").doc("today");
  await ref.set({ generatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
});

export const entitlementCleanup = functions.pubsub.schedule("every 24 hours").onRun(async () => {
  // sample: disable users with receipts explicitly marked inactive
  const q = await db.collection("receipts").where("active", "==", false).get();
  for (const d of q.docs) {
    const link = await db.collection("purchaseLinks").doc(d.id).get();
    const uid = link.exists ? link.data().uid : null;
    if (uid) await setPro(uid, false, d.get("source") || "unknown");
  }
});
