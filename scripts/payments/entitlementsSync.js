import { auth, onAuthStateChanged, db, doc, getDoc } from "/scripts/firebase-bridge.js";

export function onProChange(cb) {
  const unsub = onAuthStateChanged(auth, async (user) => {
    if (!user) { cb(false, null); return; }
    const snap = await getDoc(doc(db, "users", user.uid));
    cb(!!(snap.exists() && snap.data().pro), user.uid);
  });
  return () => unsub();
}

export async function fetchPro(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() && !!snap.data().pro;
}
