// playVerify.js (ESM)
// Production-grade Google Play verification helpers for Whylee
import admin from "firebase-admin";
import { google } from "googleapis";

const db = admin.firestore();

function getAuth() {
  // Prefer env var with the service account JSON (safer for CI/CD).
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT || "";
  const creds = raw ? JSON.parse(raw) : undefined;
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
}

export async function getAndroidPublisher() {
  const auth = await getAuth().getClient();
  return google.androidpublisher({ version: "v3", auth });
}

/**
 * Verify a modern Play SUBSCRIPTION purchase token.
 * Uses purchases.subscriptionsv2.get (supports modern Play Billing).
 *
 * Return shape (normalized):
 *   {
 *     active: boolean,
 *     productId: string,
 *     expiryTimeMillis: number|null,
 *     acknowledged: boolean|undefined,
 *     raw: ... // original response
 *   }
 */
export async function verifyPlaySubscription({ packageName, purchaseToken }) {
  const androidpublisher = await getAndroidPublisher();
  // SubscriptionsV2
  const sub = await androidpublisher.purchases.subscriptionsv2.get({
    packageName,
    token: purchaseToken,
  });

  const resp = sub.data || {};
  const linkedPurchaseToken = resp?.linkedPurchaseToken || purchaseToken;
  const lineItems = resp?.lineItems || [];
  const productId = lineItems[0]?.productId || "pro";
  const state = resp?.subscriptionState; // SUBSCRIPTION_STATE_ACTIVE, PAUSED, EXPIRED, CANCELED
  const active =
    state === "SUBSCRIPTION_STATE_ACTIVE" ||
    state === "SUBSCRIPTION_STATE_ON_HOLD" ||
    state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";
  const expiryTimeMillis = Number(lineItems[0]?.expiryTime || 0) || null;

  // Acknowledgement flag lives on purchase objects in old APIs; SubscriptionsV2 always server-side
  return {
    active: !!active,
    productId,
    expiryTimeMillis,
    acknowledged: true,
    raw: { ...resp, linkedPurchaseToken },
  };
}

/**
 * Verify a ONE-TIME purchase (in-app product).
 * Uses purchases.products.get
 */
export async function verifyPlayProduct({ packageName, productId, purchaseToken }) {
  const androidpublisher = await getAndroidPublisher();
  const res = await androidpublisher.purchases.products.get({
    packageName,
    productId,
    token: purchaseToken,
  });

  const d = res.data || {};
  // purchaseState: 0 purchased, 1 canceled, 2 pending
  const active = (d.purchaseState === 0);
  const acknowledged = !!d.acknowledged;
  return {
    active,
    productId,
    expiryTimeMillis: null,
    acknowledged,
    raw: d,
  };
}

/**
 * Persist a normalized receipt and optionally link it to a uid (if known).
 */
export async function persistReceipt({
  source = "google-play",
  uid = null,
  purchaseToken,
  productId = "pro",
  packageName,
  active,
  expiryTimeMillis = null,
  raw = {},
}) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const rref = db.collection("receipts").doc(purchaseToken);
  await rref.set(
    {
      source,
      uid: uid || null,
      productId,
      packageName,
      active: !!active,
      expiryTimeMillis: expiryTimeMillis || null,
      updatedAt: now,
      raw,
    },
    { merge: true }
  );
  return rref;
}
