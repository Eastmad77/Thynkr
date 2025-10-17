// /scripts/entitlements.js
import { db, doc, getDoc } from "./firebase-bridge.js";

/**
 * Returns true if the user has Whylee Pro.
 * Works with either of these schemas:
 *   - users/{uid}.pro === true
 *   - entitlements/{uid}.active === true
 * Adjust if your billing webhook writes to a different shape.
 */
export async function isPro(uid) {
  if (!uid) return false;

  // Preferred: flag on users/{uid}
  const uRef = doc(db, "users", uid);
  const u = await getDoc(uRef);
  if (u.exists() && !!u.data().pro) return true;

  // Fallback: entitlements collection
  const eRef = doc(db, "entitlements", uid);
  const e = await getDoc(eRef);
  return e.exists() && !!e.data().active;
}
