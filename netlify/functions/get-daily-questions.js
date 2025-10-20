const json = (s, d) => ({ statusCode: s, headers: { "content-type": "application/json" }, body: JSON.stringify(d) });

export async function handler() {
  return json(200, {
    date: new Date().toISOString().slice(0,10),
    items: [
      { q: "What is 2 + 2?", choices: ["3","4","5","6"], answer: 1 },
      { q: "Opposite of 'cold'?", choices: ["hot","wet","dry","dull"], answer: 0 }
    ]
  });
}
