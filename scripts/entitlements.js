// /scripts/entitlements.js
import { db, doc, getDoc } from "./firebase-bridge.js";

export async function isPro(uid) {
  if (!uid) return false;
  const u = await getDoc(doc(db, "users", uid));
  return u.exists() && !!u.data().pro;
}
