// ============================================================================
// state/entitlements.js — Firestore syncing + snapshot mapper
// -----------------------------------------------------------------------------
// Purpose:
// - Subscribes to a user's entitlement document in Firestore
// - Normalizes data → imports into the central plan state (plan.js)
// - Exposes helpers to write trial starts / pro activation / downgrades
//
// Requirements:
// - Firebase SDK v9+ (modular) loaded globally or via ES modules
//   If you load via <script type="module">, ensure you export/forward the
//   initialized app, auth and firestore instances to window.firebaseRefs:
//     window.firebaseRefs = { auth, db }
// - Firestore structure (suggested):
//     /users/{uid}/private/entitlements
//       plan: 'free' | 'trial' | 'pro'
//       trialActive: boolean
//       trialEndsAt: number (ms)
//       updatedAt: number (ms)
// ============================================================================

import { loadEntitlements, getEntitlements, setPro, resetEntitlements, planState } from '/js/entitlements/plan.js';

const colPath = (uid) => ['users', uid, 'private', 'entitlements'];

// Resolve firebase refs from global container or throw
function getFirebase() {
  if (!window.firebaseRefs || !window.firebaseRefs.db || !window.firebaseRefs.auth) {
    throw new Error('Firebase not initialized. Provide window.firebaseRefs = { auth, db }.');
  }
  return window.firebaseRefs;
}

/**
 * subscribeEntitlements
 * Live-subscribes to Firestore entitlement doc for the current user.
 * Calls onChange(normalizedEntitlements) whenever data changes.
 *
 * @param {(data:object)=>void} onChange
 * @returns {() => void} unsubscribe function
 */
export function subscribeEntitlements(onChange) {
  const { auth, db } = getFirebase();
  const { onAuthStateChanged } = window.firebaseExports || {};
  const { doc, onSnapshot } = window.firebaseExports || {};

  if (!onAuthStateChanged || !doc || !onSnapshot) {
    throw new Error('Expose Firestore helpers on window.firebaseExports: { doc, onSnapshot, onAuthStateChanged, setDoc, serverTimestamp }');
  }

  let unsub = () => {};
  const stopAuth = onAuthStateChanged(auth, (user) => {
    // Clean previous listener
    try { unsub(); } catch {}

    if (!user) {
      resetEntitlements();
      onChange?.(getEntitlements());
      return;
    }
    const ref = doc(db, ...colPath(user.uid));
    unsub = onSnapshot(ref, (snap) => {
      loadEntitlements(snap);
      onChange?.(getEntitlements());
    }, (err) => {
      console.error('[Whylee] entitlements snapshot error:', err);
    });
  });

  // Return combined unsubscriber
  return () => {
    try { unsub(); } catch {}
    try { stopAuth(); } catch {}
  };
}

/**
 * startTrial
 * Writes a 3-day trial window starting "now" unless a later date is passed.
 *
 * @param {number} days default 3
 * @param {Date|number} startAt optional start timestamp (ms)
 */
export async function startTrial(days = 3, startAt = Date.now()) {
  const { auth, db } = getFirebase();
  const { setDoc, doc, serverTimestamp } = window.firebaseExports || {};
  if (!setDoc || !doc || !serverTimestamp) throw new Error('Missing Firestore exports');

  const user = auth.currentUser;
  if (!user) throw new Error('User must be signed in to start trial');

  const trialEndsAt = Number(startAt) + days * 24 * 60 * 60 * 1000;
  const ref = doc(db, ...colPath(user.uid));
  await setDoc(ref, {
    plan: 'trial',
    trialActive: true,
    trialEndsAt,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // Optimistic local update
  planState.plan = 'trial';
  planState.trialActive = true;
  planState.trialEndsAt = trialEndsAt;
  planState.isPro = false;
}

/**
 * activatePro
 * Sets plan to 'pro' (e.g., after Stripe webhook → Firestore write runs server-side).
 * Safe to call from client if you want to mirror instant state (optional).
 */
export async function activatePro() {
  const { auth, db } = getFirebase();
  const { setDoc, doc, serverTimestamp } = window.firebaseExports || {};
  if (!setDoc || !doc || !serverTimestamp) throw new Error('Missing Firestore exports');

  const user = auth.currentUser;
  if (!user) throw new Error('User must be signed in');

  const ref = doc(db, ...colPath(user.uid));
  await setDoc(ref, {
    plan: 'pro',
    trialActive: false,
    trialEndsAt: null,
    updatedAt: serverTimestamp()
  }, { merge: true });

  setPro(); // local
}

/**
 * downgradeToFree
 * Clears Pro/Trial. Used when subscription cancels or trial ends.
 */
export async function downgradeToFree() {
  const { auth, db } = getFirebase();
  const { setDoc, doc, serverTimestamp } = window.firebaseExports || {};
  if (!setDoc || !doc || !serverTimestamp) throw new Error('Missing Firestore exports');

  const user = auth.currentUser;
  if (!user) throw new Error('User must be signed in');

  const ref = doc(db, ...colPath(user.uid));
  await setDoc(ref, {
    plan: 'free',
    trialActive: false,
    trialEndsAt: null,
    updatedAt: serverTimestamp()
  }, { merge: true });

  resetEntitlements(); // local
}
