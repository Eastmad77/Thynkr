// Handles Stripe events and writes entitlements to Firestore.
// Requires env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, FIREBASE_SERVICE_ACCOUNT (base64 JSON)

let admin; // lazy init to avoid cold start penalty multiple times
function getAdmin() {
  if (admin) return admin;
  admin = require("firebase-admin");
  if (!admin.apps.length) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT || "", "base64").toString("utf8");
    const creds = JSON.parse(json);
    admin.initializeApp({
      credential: admin.credential.cert(creds)
    });
  }
  return admin;
}

function emailDocId(email) {
  // simple, URL-safe Firestore doc id for email fallback
  return `email:${String(email || "").trim().toLowerCase()}`;
}

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  const cors = { "Access-Control-Allow-Origin": process.env.SITE_URL || "*" };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: cors, body: "" };
  if (event.httpMethod !== "POST")    return { statusCode: 405, headers: cors, body: "Method Not Allowed" };

  try {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let stripeEvent;

    // IMPORTANT: use raw body for signature verification
    const raw = event.body;

    if (webhookSecret) {
      stripeEvent = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
    } else {
      // Dev fallback (not recommended for prod)
      stripeEvent = JSON.parse(raw);
    }

    const admin = getAdmin();
    const db = admin.firestore();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Helper: write entitlement
    async function setEntitlement({ uid, email, plan, stripeCustomerId }) {
      const base = {
        plan,                  // "pro_monthly" | "pro_yearly" | "free"
        stripeCustomerId: stripeCustomerId || null,
        updatedAt: now,
      };

      if (uid) {
        await db.collection("users").doc(uid).set(base, { merge: true });
        return;
      }
      if (email) {
        await db.collection("users").doc(emailDocId(email)).set(
          { email, ...base }, { merge: true }
        );
      }
    }

    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const s = stripeEvent.data.object;

        // Determine plan from metadata or price lookup (subscription mode)
        let plan = "pro_monthly";
        const metaPlan = (s.metadata && s.metadata.plan) || "";
        if (metaPlan === "yearly") plan = "pro_yearly";

        await setEntitlement({
          uid:   s.metadata?.uid || null,
          email: s.customer_details?.email || s.customer_email || null,
          plan,
          stripeCustomerId: s.customer || null,
        });

        console.log("✅ Entitlement set from checkout.session.completed", {
          plan,
          uid: s.metadata?.uid || null,
          email: s.customer_details?.email || s.customer_email || null,
          customer: s.customer || null,
          session: s.id,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = stripeEvent.data.object;
        // Fetch customer to get email if needed
        let email = null;
        try {
          const customer = await stripe.customers.retrieve(sub.customer);
          email = customer.email || null;
        } catch (_) {}

        await setEntitlement({
          uid: null, // no uid on this event; we fall back to email doc
          email,
          plan: "free",
          stripeCustomerId: sub.customer || null,
        });

        console.log("🛑 Subscription canceled → set free", {
          email, customer: sub.customer
        });
        break;
      }

      case "invoice.payment_succeeded": {
        // Useful for renewals; you might confirm still pro here if desired
        console.log("🔁 invoice.payment_succeeded");
        break;
      }

      default:
        // console.log("Unhandled event:", stripeEvent.type);
        break;
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error("Webhook error:", err);
    return { statusCode: 400, headers: cors, body: `Webhook Error: ${err.message}` };
  }
};
