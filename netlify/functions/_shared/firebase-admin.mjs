// Shared Firebase Admin initializer (ESM, singleton)
// Expects FIREBASE_SERVICE_ACCOUNT to be a BASE64-encoded JSON service account.
// Never log the key. If the var isn't set, callers can detect and skip DB work.

import admin from "firebase-admin";

let _app = null;
let _db = null;

export function getAdmin() {
  if (_app) return { admin, db: _db, using: true };

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  if (!b64) {
    // No admin in this environment (local dev or preview)
    return { admin, db: null, using: false };
  }

  const jsonStr = b64.trim().startsWith("{")
    ? b64
    : Buffer.from(b64, "base64").toString("utf8");
  const creds = JSON.parse(jsonStr);

  _app = admin.apps?.length
    ? admin.apps[0]
    : admin.initializeApp({ credential: admin.credential.cert(creds) });

  _db = admin.firestore();
  return { admin, db: _db, using: true };
}
