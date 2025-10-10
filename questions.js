/* Whylee Questions Loader v6003
   Source order: Firebase (optional) -> Netlify Function (optional) -> local CSV fallback.
   CSV columns: Level,Question,OptionA,OptionB,OptionC,OptionD,Answer,Explanation,Category,Difficulty
*/
(() => {
  const CSV_FALLBACK = '/media/questions/sample-questions.csv';

  async function fetchText(url){
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  }

  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/);
    const header = lines.shift().split(',');
    return lines.map(row => {
      // naive split; your CSV should avoid unescaped commas in fields
      const c = row.split(',');
      const obj = {};
      header.forEach((h,i)=> obj[h.trim()] = (c[i]||'').trim());
      return normalizeRow(obj);
    });
  }

  function normalizeRow(r){
    const level = Number(r.Level || r.level || 1);
    const answers = [r.OptionA, r.OptionB, r.OptionC, r.OptionD].filter(Boolean);
    const correctIndex = Math.max(0, Math.min(answers.length-1, Number(r.Answer||0)));
    return {
      Level: [1,2,3].includes(level) ? level : 1,
      Question: r.Question || 'Untitled question',
      Answers: answers,
      CorrectIndex: correctIndex,
      Explanation: r.Explanation || '',
      Category: r.Category || 'General',
      Difficulty: r.Difficulty || 'Normal'
    };
  }

  function shuffle(a){
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickPerLevel(items, per = 12){
    const out = [];
    [1,2,3].forEach(l=>{
      const pool = shuffle(items.filter(q => q.Level === l));
      out.push(...pool.slice(0, per));
    });
    return out;
  }

  async function tryFirebaseFirst(){
    // Hook for future: if you expose a Netlify function or Firestore endpoint, try it here.
    // Example:
    // const text = await fetchText('/.netlify/functions/get-todays-questions');
    // return parseCSV(text);
    throw new Error('No remote source configured');
  }

  async function loadQuestions(){
    try { return await tryFirebaseFirst(); }
    catch { /* fall through */ }
    try { const csv = await fetchText(CSV_FALLBACK); return parseCSV(csv); }
    catch (e) {
      console.warn('[Whylee] Failed to load CSV fallback:', e);
      // generate tiny mock so app is still usable
      const mk = (i,l)=>({Level:l,Question:`Sample question #${i} (L${l})?`,Answers:['Correct','Alt A','Alt B','Alt C'],CorrectIndex:0,Explanation:''});
      const base = [];
      for(let l=1;l<=3;l++) for(let i=1;i<=12;i++) base.push(mk(i,l));
      return base;
    }
  }

  async function getTodaysSet(){
    const all = await loadQuestions();
    // If CSV already capped, skip pickPerLevel
    const haveAll = [1,2,3].every(l => all.filter(q=>q.Level===l).length >= 12);
    const picked = haveAll ? pickPerLevel(all, 12) : all;
    // Shuffle each question's answers but keep CorrectIndex accurate
    return picked.map(q => {
      const pairs = q.Answers.map((t,i)=>({t,i}));
      const sh = shuffle(pairs);
      const correctNewIndex = sh.findIndex(p=>p.i === q.CorrectIndex);
      return {...q, Answers: sh.map(p=>p.t), CorrectIndex: correctNewIndex};
    });
  }

  // Expose globally for game.js
  window.WhyleeQuestions = { getTodaysSet };
})();
