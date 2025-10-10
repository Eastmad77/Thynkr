// GET → summarize user profile from Firestore
// /.netlify/functions/profile?uid=abc
import { db, using as usingFirebase } from "./_shared/firebase.js";

export default async (req) => {
  try {
    const url = new URL(req.url);
    const uid = url.searchParams.get("uid") || "anon";

    if (!(usingFirebase && db)) {
      return Response.json(
        { ok: false, message: "Profiles unavailable (Firebase disabled)." },
        { status: 501 }
      );
    }

    const runsSnap = await db.collection("users").doc(uid).collection("runs")
      .orderBy("ts", "desc").limit(500).get();

    let total = 0, correct = 0, days = new Set(), perfectLevels = 0, longestStreak = 0;
    let currentStreak = 0, prevDay = null;

    runsSnap.forEach(d => {
      const r = d.data();
      total += Number(r.totalAsked || 0);
      correct += Number(r.totalCorrect || 0);
      if (r.levelReached >= 3 && r.totalCorrect === r.totalAsked) perfectLevels++;

      const day = (r.dayKey || "").trim();
      if (day) {
        days.add(day);
        if (!prevDay) { currentStreak = 1; }
        else {
          // naive streak by lexicographic next-day; fine for quick stats
          const dt = new Date(prevDay); dt.setDate(dt.getDate() - 1);
          const expected = dt.toISOString().slice(0,10);
          currentStreak = (day === expected) ? currentStreak + 1 : 1;
        }
        longestStreak = Math.max(longestStreak, currentStreak);
        prevDay = day;
      }
    });

    const accuracy = total ? Math.round((correct / total) * 100) : 0;

    return Response.json({
      ok: true,
      uid,
      totals: { totalQuestions: total, correct, accuracy },
      perfectLevels,
      longestStreak,
      daysPlayed: days.size
    });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
};
