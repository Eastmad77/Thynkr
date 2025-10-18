import * as functions from "firebase-functions";
import admin from "firebase-admin";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import {
  verifyPlaySubscription,
  verifyPlayProduct,
  persistReceipt,
  getAndroidPublisher,
} from "./playVerify.js";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ====== ENV ======
const STRIPE_SECRET = process.env.STRIPE_SECRET || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const PLAY_PACKAGE_NAME = process.env.PLAY_PACKAGE_NAME || "app.whylee";
const stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET) : null;

// ====== Helpers ======
async function flipPro(uid, active, source, extra = {}) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const uref = db.doc(`users/${uid}`);
  const eref = db.doc(`entitlements/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(uref);
    if (!snap.exists) tx.set(uref, { createdAt: now });
    tx.set(
      uref,
      { pro: !!active, proUpdatedAt: now, proSource: source, ...extra.user },
      { merge: true }
    );
    tx.set(
      eref,
      { active: !!active, source, updatedAt: now, ...extra.entitlement },
      { merge: true }
    );
  });
}

function uidFrom(obj) {
  return (
    obj?.metadata?.uid ||
    obj?.data?.object?.metadata?.uid ||
    obj?.uid ||
    null
  );
}

// ====== Stripe Checkout ======
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
      metadata: { uid },
    });
    res.json({ id: session.id, url: session.url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Stripe error" });
  }
});

// ====== Stripe Webhook ======
const stripeApp = express();
stripeApp.use(cors({ origin: true }));
stripeApp.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) return res.status(500).send("Stripe not configured");
  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook verify failed", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const sess = event.data.object;
        const uid = uidFrom(sess);
        if (uid) await flipPro(uid, true, "stripe", { entitlement: { product: "pro" } });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object;
        const uid = uidFrom(sub);
        const active = ["active", "trialing", "past_due"].includes(sub.status);
        if (uid)
          await flipPro(uid, active, "stripe", {
            entitlement: { product: sub.items?.data?.[0]?.price?.product || "pro" },
          });
        break;
      }
      case "customer.subscription.deleted":
      case "invoice.payment_failed": {
        const obj = event.data.object;
        const uid = uidFrom(obj);
        if (uid) await flipPro(uid, false, "stripe");
        break;
      }
      default:
        break;
    }
    res.status(200).send("[ok]");
  } catch (e) {
    console.error(e);
    res.status(500).send("Stripe webhook handler error");
  }
});
export const stripeWebhook = functions.https.onRequest(stripeApp);

// ====== Map Play purchaseToken → uid (from app after purchase) ======
export const linkPurchaseToken = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const { purchaseToken, uid, sku } = req.body || {};
    if (!purchaseToken || !uid) return res.status(400).json({ error: "Missing" });
    await db.collection("purchaseLinks").doc(purchaseToken).set(
      {
        uid,
        sku: sku || "pro",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ====== Optional: HTTPS on-demand verify (debug tool) ======
export const verifyPlay = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).send("");
  try {
    const { purchaseToken, productId, type } = req.body || {};
    if (!purchaseToken) return res.status(400).json({ error: "Missing token" });

    let result;
    if (type === "subs" || (!type && !productId)) {
      result = await verifyPlaySubscription({
        packageName: PLAY_PACKAGE_NAME,
        purchaseToken,
      });
    } else {
      result = await verifyPlayProduct({
        packageName: PLAY_PACKAGE_NAME,
        productId,
        purchaseToken,
      });
    }

    await persistReceipt({
      source: "google-play",
      uid: null,
      purchaseToken,
      productId: result.productId || productId || "pro",
      packageName: PLAY_PACKAGE_NAME,
      active: result.active,
      expiryTimeMillis: result.expiryTimeMillis,
      raw: result.raw,
    });

    res.json({ ok: true, result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ====== Pub/Sub: RTDN from Play (final authority) ======
export const playBillingRtdn = functions.pubsub.topic("play-billing").onPublish(async (msg) => {
  try {
    const data = msg.json || JSON.parse(Buffer.from(msg.data, "base64").toString());
    const sub = data?.subscriptionNotification;
    const one = data?.oneTimeProductNotification;

    if (!sub && !one) return;

    const purchaseToken = (sub?.purchaseToken || one?.purchaseToken || "").trim();
    const productId = (sub?.subscriptionId || one?.sku || "pro").trim();
    const packageName = (sub?.packageName || one?.packageName || PLAY_PACKAGE_NAME).trim();

    if (!purchaseToken) return;
    if (packageName !== PLAY_PACKAGE_NAME) return;

    let result;
    if (sub) {
      // Subscription → verify with SubscriptionsV2
      result = await verifyPlaySubscription({ packageName, purchaseToken });
    } else {
      // One-time product
      result = await verifyPlayProduct({ packageName, productId, purchaseToken });
    }

    // Persist receipt
    await persistReceipt({
      source: "google-play",
      uid: null,
      purchaseToken,
      productId: result.productId || productId || "pro",
      packageName,
      active: !!result.active,
      expiryTimeMillis: result.expiryTimeMillis || null,
      raw: result.raw || {},
    });

    // Link to uid if we have it from /linkPurchaseToken
    const linkSnap = await db.collection("purchaseLinks").doc(purchaseToken).get();
    const uid = linkSnap.exists ? linkSnap.data().uid : null;

    if (uid) {
      await flipPro(uid, !!result.active, "google-play", {
        entitlement: {
          product: result.productId || productId || "pro",
          expiryTimeMillis: result.expiryTimeMillis || null,
        },
      });
    }
  } catch (e) {
    console.error("playBillingRtdn error", e);
  }
});

// ====== Daily housekeeping (optional) ======
export const entitlementCleanup = functions.pubsub.schedule("every 24 hours").onRun(async () => {
  const now = Date.now();
  const q = await db.collection("receipts")
    .where("expiryTimeMillis", ">", 0)
    .get();

  const batch = db.batch();
  q.docs.forEach((d) => {
    const exp = Number(d.get("expiryTimeMillis") || 0);
    const active = exp ? exp > now : !!d.get("active");
    batch.update(d.ref, { active, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });
  await batch.commit();
});
