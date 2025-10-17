// /auth/cloudsync.js
import { db, auth } from "../firebase.js";

export const CloudSync = {
  async init() {
    auth.onAuthStateChanged(async (user) => {
      if (user) await this.pullProfile(user.uid);
    });
  },

  async pullProfile(uid) {
    try {
      const snap = await db.collection("profiles").doc(uid).get();
      if (snap.exists) {
        localStorage.setItem("whylee_profile", JSON.stringify(snap.data()));
      }
    } catch (err) {
      console.warn("CloudSync: pull failed", err);
    }
  },

  async pushProfile(profile) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await db.collection("profiles").doc(user.uid).set(profile, { merge: true });
    } catch (err) {
      console.error("CloudSync: push failed", err);
    }
  },

  saveLocal(profile) {
    localStorage.setItem("whylee_profile", JSON.stringify(profile));
  },

  getLocal() {
    return JSON.parse(localStorage.getItem("whylee_profile") || "{}");
  },
};
