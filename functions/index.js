import * as functions from "firebase-functions";
import admin from "firebase-admin";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import { google } from "googleapis";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ----- ENV -----
const STRIPE_SECRET = process.env.STRIPE_SECRET;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PLAY_PACKAGE_NAME = process.env.PLAY_PACKAGE_NAME || "app.whylee";
const GOOGLE_PLAY_SERVICE_ACCOUNT = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT || "";
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET) : null;

// ----- Helper: set entitlement -----
async function setPro(uid, active, source, meta = {}) {
  const uref = db.doc(`users/${uid}`);
  const eref = db.doc(`entitlements/${uid}`);
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.runTransaction(async (tx) => {
    const uSnap = await tx.get(uref);
    if (!uSnap.exists) tx.set(uref, { createdAt: now });
    tx.set(uref, { pro: !!active, proUpdatedAt: now, proSource: source, ...meta.user }, { merge: true });
    tx.set(eref, { active: !!active, source, updatedAt: now, ...meta.entitlement }, { merge: true });
  });
}

function getUidFromMetadata(obj) {
  return obj?.metadata?.uid || obj?.data?.object?.metadata?.uid || null;
}

// ----- HTTPS: Stripe Checkout -----
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
    console.error(e); res.status(500).json({ error: e.message || "Stripe error" });
  }
});

// ----- HTTPS: Stripe Webhook -----
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
        const active = ["active", "trialing", "past_due"].includes(sub.status);
        if (uid) await setPro(uid, active, "stripe", {
          entitlement: { product: sub.items?.data?.[0]?.price?.product || "pro" }
        });
        break;
      }
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const obj = event.data.object;
        const uid = getUidFromMetadata(obj);
        if (uid) await setPro(uid, false, "stripe");
        break;
      }
      default: break;
    }
    res.status(200).send("[ok]");
  } catch (e) {
    console.error(e); res.status(500).send("Webhook handler error");
  }
});
export const stripeWebhook = functions.https.onRequest(stripeApp);

// ----- HTTPS: linkPurchaseToken (map token -> uid) -----
export const linkPurchaseToken = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const { purchaseToken, uid, sku } = req.body || {};
    if (!purchaseToken || !uid) return res.status(400).json({ error: "Missing" });
    await db.collection("purchaseLinks").doc(purchaseToken).set({
      uid, sku: sku || "pro", createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    console.error(e); res.status(500).json({ error: e.message });
  }
});

// ----- Pub/Sub: Play RTDN (verify → setPro) -----
export const playBillingRtdn = functions.pubsub.topic("play-billing").onPublish(async (msg) => {
  try {
    const data = msg.json || JSON.parse(Buffer.from(msg.data, "base64").toString());
    const sub = data?.subscriptionNotification || data?.oneTimeProductNotification || {};
    const { purchaseToken, sku, packageName } = sub;
    if (!purchaseToken || (packageName && packageName !== PLAY_PACKAGE_NAME)) return;

    const auth = GOOGLE_PLAY_SERVICE_ACCOUNT
      ? new google.auth.GoogleAuth({ credentials: JSON.parse(GOOGLE_PLAY_SERVICE_ACCOUNT), scopes: ["https://www.googleapis.com/auth/androidpublisher"] })
      : new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/androidpublisher"] });

    const androidpublisher = google.androidpublisher({ version: "v3", auth });

    // TODO: Verify token with Android Publisher API and set active depending on state.
    // Example for products:
    // const verify = await androidpublisher.purchases.products.get({
    //   packageName: PLAY_PACKAGE_NAME, productId: sku, token: purchaseToken
    // });

    await db.collection("receipts").doc(purchaseToken).set({
      source: "google-play", sku: sku || "pro", active: true,
      packageName: PLAY_PACKAGE_NAME, updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    const linkSnap = await db.collection("purchaseLinks").doc(purchaseToken).get();
    const uid = linkSnap.exists ? linkSnap.data().uid : null;
    if (uid) await setPro(uid, true, "google-play", { entitlement: { product: sku || "pro" } });
  } catch (e) {
    console.error("RTDN error", e);
  }
});

// ----- Schedulers -----
export const dailySeed = functions.pubsub.schedule("every day 02:00").timeZone("Etc/UTC").onRun(async () => {
  await db.collection("daily").doc("today").set(
    { generatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
});

export const entitlementCleanup = functions.pubsub.schedule("every 24 hours").onRun(async () => {
  const q = await db.collection("receipts").where("active", "==", false).get();
  for (const d of q.docs) {
    const link = await db.collection("purchaseLinks").doc(d.id).get();
    const uid = link.exists ? link.data().uid : null;
    if (uid) await setPro(uid, false, d.get("source") || "unknown");
  }
});
