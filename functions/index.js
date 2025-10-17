/**
 * Whylee Cloud Functions (v8)
 * Node 20 / Firebase Functions v2
 *
 * Endpoints:
 *  - GET  /health                      -> quick status
 *  - POST /createCheckoutSession       -> Stripe Checkout (subscription)
 *  - POST /stripeWebhook               -> Stripe webhook (raw body signature verify)
 *  - GET  /getDailyQuestions?date=...  -> fetch daily questions
 *  - POST /submitResults               -> write user session + XP
 */

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const cors = require("cors")({ origin: true });

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp, runTransaction } = require("firebase-admin/firestore");

// Initialize Admin SDK once
initializeApp();
const db = getFirestore();

// Functions defaults
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
  timeoutSeconds: 60,
});

// ---------- Utilities ----------
function ok(res, data) {
  res.status(200).json({ ok: true, ...data });
}
function bad(res, msg, code = 400) {
  res.status(code).json({ ok: false, error: msg });
}

// ---------- 1) Health ----------
exports.health = onRequest(async (req, res) => {
  cors(req, res, async () => {
    ok(res, {
      service: "whylee-functions",
      version: "v8",
      time: new Date().toISOString(),
    });
  });
});

// ---------- 2) Stripe: Checkout Session ----------
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET || "", {
  apiVersion: "2024-06-20",
});

/**
 * Body:
 *  {
 *    "uid": "<firebase uid>",
 *    "priceId": "price_XXX",
 *    "success_url": "https://yourapp/success",
 *    "cancel_url": "https://yourapp/cancel"
 *  }
 */
exports.createCheckoutSession = onRequest({ secrets: ["STRIPE_SECRET"] }, async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") return bad(res, "Use POST", 405);
      const { uid, priceId, success_url, cancel_url } = req.body || {};
      if (!uid || !priceId || !success_url || !cancel_url) return bad(res, "Missing parameters");

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url,
        cancel_url,
        metadata: { uid },
      });

      ok(res, { url: session.url });
    } catch (err) {
      logger.error("createCheckoutSession error", err);
      bad(res, err.message, 500);
    }
  });
});

// ---------- 3) Stripe: Webhook ----------
/**
 * Set secrets before deploy:
 *   firebase functions:secrets:set STRIPE_SECRET
 *   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 *
 * Stripe dashboard: add endpoint
 *    https://us-central1-<PROJECT_ID>.cloudfunctions.net/stripeWebhook
 * and copy the Signing Secret to STRIPE_WEBHOOK_SECRET
 */
exports.stripeWebhook = onRequest(
  { secrets: ["STRIPE_SECRET", "STRIPE_WEBHOOK_SECRET"], cors: false },
  async (req, res) => {
    // Stripe requires raw body for signature verification
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
      logger.error("Stripe webhook signature verification failed", err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle selected subscription events
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const uid = event.data.object.metadata?.uid;
          if (uid) {
            await db.doc(`users/${uid}`).set(
              {
                proStatus: true,
                proProvider: "stripe",
                proUpdatedAt: Timestamp.now(),
              },
              { merge: true }
            );
          }
          break;
        }
        case "customer.subscription.deleted": {
          // Optional: mark pro off when canceled
          const subscription = event.data.object;
          const uid = subscription.metadata?.uid;
          if (uid) {
            await db.doc(`users/${uid}`).set(
              { proStatus: false, proUpdatedAt: Timestamp.now() },
              { merge: true }
            );
          }
          break;
        }
        default:
          // no-op
          break;
      }

      res.status(200).send("ok");
    } catch (err) {
      logger.error("Stripe webhook handling error", err);
      res.status(500).send("internal error");
    }
  }
);

// ---------- 4) Daily Questions ----------
/**
 * GET /getDailyQuestions?date=YYYY-MM-DD
 * Reads: /daily_questions/{date}
 * Fallback: /daily_questions/latest
 */
exports.getDailyQuestions = onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const date = (req.query.date || "").toString().trim();
      let ref = date ? db.doc(`daily_questions/${date}`) : db.doc("daily_questions/latest");
      const snap = await ref.get();
      if (!snap.exists) return bad(res, "No daily questions found", 404);
      ok(res, { date: snap.id, payload: snap.data() });
    } catch (err) {
      logger.error("getDailyQuestions error", err);
      bad(res, err.message, 500);
    }
  });
});

// ---------- 5) Submit Results / XP sync ----------
/**
 * Body:
 *  {
 *    "uid": "<firebase uid>",
 *    "correct": 7,
 *    "total": 10,
 *    "durationMs": 54000,
 *    "mode": "daily" | "challenge"
 *  }
 */
exports.submitResults = onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") return bad(res, "Use POST", 405);
      const { uid, correct = 0, total = 0, durationMs = 0, mode = "daily" } = req.body || {};
      if (!uid) return bad(res, "Missing uid");

      const xpEarned = Math.max(0, Math.round(correct * 20 - (durationMs / 1000 / total) * 2));

      const userRef = db.doc(`users/${uid}`);
      const sessionRef = userRef.collection("sessions").doc();

      await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        const base = userSnap.exists ? userSnap.data() : { xp: 0, level: 1, streak: 0, badges: [] };

        // Simple leveling: 1000 xp per level
        const newXp = (base.xp || 0) + xpEarned;
        const newLevel = Math.max(1, Math.floor(newXp / 1000) + 1);

        tx.set(sessionRef, {
          createdAt: Timestamp.now(),
          mode,
          correct,
          total,
          durationMs,
          xpEarned,
        });

        tx.set(
          userRef,
          {
            xp: newXp,
            level: newLevel,
            lastUpdate: Timestamp.now(),
          },
          { merge: true }
        );
      });

      ok(res, { xpEarned });
    } catch (err) {
      logger.error("submitResults error", err);
      bad(res, err.message, 500);
    }
  });
});
