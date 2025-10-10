// POST → store a run summary in Firestore (if configured). Otherwise 501.
// Body: { uid?, dayKey, totalCorrect, totalAsked, streak, levelReached, durationMs }

import { db, using as usingFirebase } from "./_shared/firebase.js";

export default async (req) => {
  if (req.method !== "POST")
    return new Response("Method Not Allowed", { status: 405 });

  try {
    const body = await req.json();

    if (!(usingFirebase && db)) {
      return Response.json(
        { ok: false, message: "Storage not configured (Firebase disabled)." },
        { status: 501 }
      );
    }

    const now = Date.now();
    const doc = {
      ...body,
      ts: now,
      ua: req.headers.get("user-agent") || "",
      ip: req.headers.get("x-forwarded-for") || "",
      app: "whylee",
    };

    const uid = body.uid || "anon";
    await db.collection("users").doc(uid).collection("runs").add(doc);

    // Aggregate shorthand (daily)
    const dayKey = body.dayKey || new Date(now).toISOString().slice(0, 10);
    await db.collection("daily_stats").doc(dayKey).set(
      { lastRunAt: now, runs: (db.fieldValue?.increment?.(1) ?? 1) },
      { merge: true }
    ).catch(()=>{ /* ignore if fieldValue not available in this runtime */ });

    return Response.json({ ok: true });
  } catch (err) {
    console.error(err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
};
