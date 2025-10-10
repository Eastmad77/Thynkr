// GET → returns today's 36 questions.
// Priority: Firebase (collection "questions" with {dayKey}) → fallback CSV at /media/questions/sample-questions.csv

import { db, using as usingFirebase } from "./_shared/firebase.js";

function dayKeyNow(tz = "UTC") {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
}

async function csvFallback() {
  // NOTE: During functions build, the site root is copied; static files are accessible via fetch to your own domain.
  // For local dev serve, we read from relative path via import.meta.url trick.
  try {
    const url = new URL("../../media/questions/sample-questions.csv", import.meta.url);
    const text = await (await fetch(url)).text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const [header, ...rows] = lines;
    const cols = header.split(",").map((s) => s.trim());
    return rows.slice(0, 36).map((r) => {
      const vals = r.split(",").map((s) => s.trim());
      const obj = Object.fromEntries(cols.map((c, i) => [c, vals[i] ?? ""]));
      // Normalize shape used by app
      return {
        Question: obj.Question || obj.Prompt || "Question?",
        Answers: [obj.OptionA, obj.OptionB, obj.OptionC, obj.OptionD].filter(Boolean),
        CorrectIndex: isNaN(Number(obj.Answer)) ? 0 : Number(obj.Answer),
        Explanation: obj.Explanation || "",
        Level: Number(obj.Level || 1),
        Category: obj.Category || "General",
        Difficulty: obj.Difficulty || "easy",
        ID: obj.ID || crypto.randomUUID(),
      };
    });
  } catch (e) {
    console.error("[csvFallback] failed", e);
    return [];
  }
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    const tz = url.searchParams.get("tz") || "UTC";
    const dayKey = url.searchParams.get("day") || dayKeyNow(tz);

    // Firebase first
    if (usingFirebase && db) {
      const snap = await db
        .collection("daily_sets")
        .doc(dayKey)
        .get();

      if (snap.exists) {
        const data = snap.data();
        return Response.json({ dayKey, source: "firebase", items: data.items || [] }, { headers: { "Cache-Control": "no-store" } });
      }
    }

    // Fallback to CSV
    const items = await csvFallback();
    return Response.json({ dayKey, source: "csv", items }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
};

