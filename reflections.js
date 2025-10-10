/* Whylee Reflections v6004 — lightweight, local list; can swap to Firestore later */
(() => {
  const LINES = [
    "Small, steady focus beats big, rare effort.",
    "Curiosity is a muscle—ask one more question today.",
    "Your brain loves patterns. Notice one new pattern now.",
    "Breathe in for four, out for six. Think clearer.",
    "Repetition with variation builds mastery.",
    "Write one sentence to remember today’s insight.",
    "A tiny improvement repeated becomes momentum.",
    "Switch perspective: explain it to a friend."
  ];

  function seed(str){
    let h = 2166136261>>>0; for (let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h>>>0;
  }

  function getTodayReflection(){
    const d = new Date().toISOString().slice(0,10);
    const s = seed(d); const idx = s % LINES.length;
    return LINES[idx];
  }

  window.WhyleeReflections = { getTodayReflection };
})();
