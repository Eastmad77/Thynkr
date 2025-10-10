// reflections.js — small wisdom card after a session
window.WhyleeReflections = (function(){
  const TIPS = [
    "Short bursts beat marathon sessions. Come back tomorrow!",
    "Repetition is how neurons say hello again. Nice work.",
    "If you felt stuck, that’s learning showing up.",
    "Celebrate the tries, not just the wins.",
    "Consistency compounds. Even 5 minutes counts."
  ];
  function randomTip(){ return TIPS[Math.floor(Math.random()*TIPS.length)]; }

  function showCard({title="Whylee’s Wisdom", tip=randomTip() }={}){
    const wrap = document.createElement('div');
    wrap.className = 'reflection';
    wrap.innerHTML = `
      <div class="reflection-card">
        <img class="fox" src="/media/icons/whylee-fox.svg" width="48" height="48" alt="" />
        <h3>${title}</h3>
        <p>${tip}</p>
        <button id="refClose" class="primary">Nice</button>
      </div>
    `;
    document.body.appendChild(wrap);
    document.getElementById('refClose').addEventListener('click', ()=> wrap.remove(), { once:true });
  }

  return { showCard, randomTip };
})();
