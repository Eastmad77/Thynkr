// netlify/functions/generateDailyQuestions.js — autonomous daily generator
import { createClient } from "@netlify/functions";
import { Firestore } from "@google-cloud/firestore";

export const handler = async () => {
  try {
    const db = new Firestore({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      }
    });

    // Example daily generation logic (stub for now)
    const questions = [
      { question: "What part of the brain processes memory?", choices: ["Hippocampus", "Cerebellum", "Amygdala"], correctIndex: 0 },
      { question: "2 + 2 × 2 = ?", choices: ["8", "6", "4"], correctIndex: 1 }
    ];

    const today = new Date().toISOString().slice(0, 10);
    await db.collection("dailyQuestions").doc(today).set({
      date: today,
      questions,
      createdAt: new Date()
    });

    return { statusCode: 200, body: JSON.stringify({ success: true, count: questions.length }) };
  } catch (err) {
    console.error("Error generating questions:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
