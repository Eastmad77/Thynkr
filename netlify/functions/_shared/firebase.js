// ESM helper to optionally initialize Firebase Admin.
// Works if FIREBASE_SERVICE_ACCOUNT is set (JSON string or base64).
// Otherwise exports { db:null, using:false } and callers fail gracefully.

let db = null;
let using = false;

try {
  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  if (saRaw) {
    const json =
      saRaw.trim().startsWith("{")
        ? JSON.parse(saRaw)
        : JSON.parse(Buffer.from(saRaw, "base64").toString("utf8"));

    const { initializeApp, applicationDefault, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    // Prevent re-init when functions hot-reload
    const apps = (await import("firebase-admin/app")).getApps();
    const app =
      apps.length > 0
        ? apps[0]
        : initializeApp({
            credential: json ? cert(json) : applicationDefault(),
            projectId: json?.project_id,
          });

    db = getFirestore(app);
    using = true;
  }
} catch (err) {
  console.warn("[firebase] disabled:", err?.message || err);
}

export { db, using };
