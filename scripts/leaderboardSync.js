/**
 * Whylee Leaderboard Sync (v8)
 * Pushes XP and streak data to the public leaderboard after gameplay.
 * Each update writes:
 *   /leaderboard/{uid} {
 *      name, avatarId, emoji, xp, streak, updatedAt
 *   }
 */

import { db, doc, setDoc, getDoc } from "/scripts/firebase-bridge.js";

/**
 * Syncs player stats to leaderboard after a session.
 * Called after game finishes.
 * @param {string} uid - Current user's UID
 * @param {object} userData - Snapshot of user data (XP, streak, name, avatarId)
 */
export async function syncLeaderboard(uid, userData = {}) {
  if (!uid) return console.warn("Leaderboard sync skipped: no UID");

  try {
    const { name = "Player", xp = 0, streak = 0, avatarId = "fox-default", emoji = "🧠" } = userData;
    const ref = doc(db, "leaderboard", uid);

    const current = await getDoc(ref);
    const prevXP = current.exists() ? (current.data().xp || 0) : 0;

    // Only update if XP or streak changed to reduce Firestore writes
    if (xp !== prevXP) {
      await setDoc(ref, {
        name,
        avatarId,
        emoji,
        xp,
        streak,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log(`[Leaderboard] Synced ${name} (XP ${xp}, streak ${streak})`);
    }
  } catch (err) {
    console.error("[Leaderboard] Sync failed", err);
  }
}
