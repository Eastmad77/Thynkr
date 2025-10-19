// netlify/functions/get-daily-questions.js
// Minimal example — return a small set (can be backed by Firestore later)
const json = (statusCode, data, headers = {}) => ({
  statusCode,
  headers: { "content-type": "application/json", ...headers },
  body: JSON.stringify(data),
});

export async function handler() {
  return json(200, {
    date: new Date().toISOString().slice(0,10),
    items: [
      { q: "What is 2 + 2?", choices: ["3","4","5","6"], answer: 1 },
      { q: "Opposite of 'cold'?", choices: ["hot","wet","dry","dull"], answer: 0 }
    ]
  });
}
