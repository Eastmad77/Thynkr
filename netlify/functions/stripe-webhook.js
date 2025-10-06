// Stripe webhook → updates Firestore entitlements for Thynkr
// Requires env:
//  - STRIPE_WEBHOOK_SECRET
//  - STRIPE_SECRET_KEY
//  - FIREBASE_SERVICE_ACCOUNT (base64 of service account JSON)
//  - FIREBASE_PROJECT_ID (optional if present in SA)
//  - SITE_URL (for logs)

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const admin = require("firebase-admin");

let app;
function getAdmin() {
  if (app) return admin;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!b64) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT");
  const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  app = admin.initializeApp({
    credential: admin.credential.cert(json),
    projectId: process.env.FIREBASE_PROJECT_ID || json.project_id,
  });
  return admin;
}

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  // CORS not required for Stripe -> Function
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let evt;
  try {
    evt = stripe.webhooks.constructEvent(event.body, sig, secret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    const adminSDK = getAdmin();
    const db = adminSDK.firestore();
    const now = adminSDK.firestore.FieldValue.serverTimestamp();

    // Helpers
    async function setPlanForSession(session, planName) {
      const uid = session.metadata?.uid || "";
      const email = session.customer_details?.email || session.customer_email || "";
      const stripeCustomerId = session.customer || "";

      // Prefer UID doc; else email-scoped doc
      let docRef;
      if (uid) docRef = db.collection("users").doc(uid);
      else if (email) docRef = db.collection("users").doc(`email:${email.toLowerCase()}`);
      else docRef = db.collection("users").doc(`stripe:${stripeCustomerId}`);

      await docRef.set({
        plan: planName,                          // "pro_monthly" | "pro_yearly"
        stripeCustomerId,
        updatedAt: now,
        brand: "thynkr"
      }, { merge: true });
    }

    switch (evt.type) {
      case "checkout.session.completed": {
        const session = evt.data.object;
        // Determine plan from metadata or line_items
        const plan = (session.metadata?.plan || "").toLowerCase(); // "monthly"/"yearly"
        const planName = plan === "yearly" ? "pro_yearly" : "pro_monthly";
        await setPlanForSession(session, planName);
        break;
      }
      case "invoice.payment_succeeded": {
        // Useful for renewal confirmation
        break;
      }
      case "customer.subscription.deleted": {
        const sub = evt.data.object;
        // Find user by customer ID and set to free
        const stripeCustomerId = sub.customer;
        const q = await db.collection("users").where("stripeCustomerId", "==", stripeCustomerId).limit(1).get();
        if (!q.empty) {
          await q.docs[0].ref.set({ plan: "free", updatedAt: now }, { merge: true });
        }
        break;
      }
      default:
        // ignore
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error("Webhook handler error:", err);
    return { statusCode: 500, body: "Webhook processing error" };
  }
};
