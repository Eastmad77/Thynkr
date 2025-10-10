// questions.js — inline demo set (36) so no CSV fetch needed
window.WhyleeQuestions = (function(){
  const L1 = Array.from({length:12}, (_,i)=>({
    Question:`Warm-up ${i+1}: 2 + ${i+1} = ?`,
    Answers:[`${i+3}`,`${i+2}`,`${i+4}`,`${i}`],
    Correct:0, Explanation:`Because 2 + ${i+1} = ${i+3}.`, Level:1
  }));

  const flags = [["🇧🇷","Brazil"],["🇨🇦","Canada"],["🇪🇸","Spain"],["🇮🇹","Italy"],["🇯🇵","Japan"],["🇫🇷","France"]];
  const L2 = Array.from({length:12}, (_,i)=>({
    Question:`Match the pair: Which country uses this flag? ${flags[i%flags.length][0]}`,
    Answers:[flags[i%flags.length][1],"Germany","Norway","Chile"],
    Correct:0, Explanation:`That flag is ${flags[i%flags.length][1]}.`, Level:2
  }));

  const L3 = [
    {Q:"Which planet is known as the Red Planet?", A:["Mars","Venus","Jupiter","Saturn"], E:"Iron oxide makes Mars look red."},
    {Q:"The largest ocean on Earth?", A:["Pacific","Atlantic","Indian","Arctic"], E:"The Pacific is the largest."},
    {Q:"Speed of light is about…", A:["300,000 km/s","150,000 km/s","3,000 km/s","30,000 km/s"], E:"~3×10⁵ km/s."},
    {Q:"H2O is…", A:["Water","Hydrogen","Oxygen","Salt"], E:"H₂O is water."},
    {Q:"Primary source of Earth’s energy?", A:["Sun","Core","Moon","Tides"], E:"Solar radiation."},
    {Q:"Who painted the Mona Lisa?", A:["Leonardo da Vinci","Michelangelo","Raphael","Monet"], E:"Leonardo da Vinci."},
    {Q:"DNA stands for…", A:["Deoxyribonucleic acid","Dicarboxylic nitro acid","Dinucleic amino acid","None"], E:"Deoxyribonucleic acid."},
    {Q:"Capital of Canada?", A:["Ottawa","Toronto","Vancouver","Montreal"], E:"Ottawa."},
    {Q:"The chemical symbol for gold?", A:["Au","Ag","Gd","Go"], E:"Au."},
    {Q:"Which gas do plants absorb?", A:["CO₂","O₂","N₂","H₂"], E:"Carbon dioxide."},
    {Q:"Largest mammal?", A:["Blue whale","Elephant","Giraffe","Hippo"], E:"Blue whale."},
    {Q:"Continent with the Sahara?", A:["Africa","Asia","Australia","South America"], E:"Africa."},
  ].map(x=>({Question:x.Q, Answers:x.A, Correct:0, Explanation:x.E, Level:3}));

  const ALL = [...L1, ...L2, ...L3];
  return { async load(){ return ALL; } };
})();
