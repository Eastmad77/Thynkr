/**
 * Whylee Cloud Function: linkPurchaseToken
 * ----------------------------------------
 * Creates or updates a link between a Google Play purchaseToken and a Whylee user UID.
 * This is used by the RTDN (Real-Time Developer Notifications) handler to map a verified
 * purchase back to the user who made it.
 *
 * Called directly from the PWA/TWA bridge after a Play Billing purchase is completed.
 */

import * as functions from "firebase-functions";
import admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const linkPurchaseToken = functions.https.onRequest(async (req, res) => {
  // Allow cross-origin requests (for your app origin)
  res.set("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight (CORS) requests
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    // Extract expected parameters
    const { purchaseToken, uid, sku } = req.body || {};

    if (!purchaseToken || !uid) {
      return res.status(400).json({ error: "Missing purchaseToken or uid" });
    }

    // Record the link in Firestore
    await db.collection("purchaseLinks").doc(purchaseToken).set(
      {
        uid,
        sku: sku || "pro",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`[linkPurchaseToken] Linked token ${purchaseToken} to uid ${uid}`);

    res.json({ ok: true, message: "Purchase token linked successfully" });
  } catch (e) {
    console.error("[linkPurchaseToken] Error:", e);
    res.status(500).json({ error: e.message || "Internal server error" });
  }
});
