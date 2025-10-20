// netlify/functions/_shared/firebase-admin.mjs
// Unified Firebase Admin singleton for all Netlify Functions.
// Expects FIREBASE_SERVICE_ACCOUNT env var as base64-encoded JSON (or raw JSON).

import admin from 'firebase-admin';

let _app = null;
let _db  = null;
let _using = false;

export function getAdmin() {
  if (_app) return { admin, db: _db, using: _using };

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!raw) {
    console.warn('[firebase-admin] FIREBASE_SERVICE_ACCOUNT not set; Firebase disabled.');
    return { admin, db: null, using: false };
  }

  let creds;
  try {
    const json =
      raw.trim().startsWith('{')
        ? raw
        : Buffer.from(raw, 'base64').toString('utf8');
    creds = JSON.parse(json);
  } catch (e) {
    console.error('[firebase-admin] Could not parse FIREBASE_SERVICE_ACCOUNT:', e?.message || e);
    return { admin, db: null, using: false };
  }

  _app = admin.apps?.length ? admin.app() : admin.initializeApp({
    credential: admin.credential.cert(creds),
    projectId: process.env.FIREBASE_PROJECT_ID || creds.project_id,
  });

  _db = admin.firestore();
  _using = true;
  return { admin, db: _db, using: _using };
}
