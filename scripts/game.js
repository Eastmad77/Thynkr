/**
 * Whylee Gameplay (v8+ MATCH with sound + progress)
 */
import { auth, db, doc, getDoc, updateDoc } from "/scripts/firebase-bridge.js";
import { mountAvatarBadge } from "/scripts/components/avatarBadge.js";
import { initQuestionEngine } from "/scripts/ai/questionEngine.js";
import { evaluateMilestones, persistMilestones } from "/scripts/milestones.js";
import { syncLeaderboard } from "/scripts/leaderboardSync.js";

const hudScore = document.getElementById("hudScore");
await mountAvatarBadge("#hudUser", { size: 56, uid: auth.currentUser?.uid });

const startBtn  = document.getElementById("startBtn");
const nextBtn   = document.getElementById("nextBtn");
const finishBtn = document.getElementById("finishBtn");
const viewport  = document.getElementById("viewport");
const qIdxEl    = document.getElementById("qIdx");
const qTotalEl  = document.getElementById("qTotal");
const timerEl   = document.getElementById("timer");

// sounds
const sndCorrect = new Audio("/media/audio/correct.mp3");
const sndWrong   = new Audio("/media/audio/incorrect.mp3");
const sndClick   = new Audio("/media/audio/click.mp3");

let eng = null, t0 = 0, tickHandle = null;

function startTimer(){
  t0 = Date.now(); stopTimer();
  tickHandle = setInterval(()=>timerEl.textContent=Math.floor((Date.now()-t0)/1000),1000);
}
function stopTimer(){ if(tickHandle){clearInterval(tickHandle);tickHandle=null;} }

function renderQuestion(q, index, total){
  qIdxEl.textContent = index+1;
  qTotalEl.textContent = total;
  if(q.type==="match") return renderMatch(q);

  viewport.innerHTML = `
    <h2 class="q-title">${q.q}</h2>
    <div class="answers">
      ${q.choices.map((l,i)=>`<button class="btn-answer" data-i="${i}">${l}</button>`).join("")}
    </div>`;
  viewport.querySelectorAll(".btn-answer").forEach(btn=>{
    btn.addEventListener("click",()=>{
      sndClick.play();
      const guess=+btn.dataset.i, ok=eng.submit(guess,Date.now()-t0);
      viewport.querySelectorAll(".btn-answer").forEach(b=>b.disabled=true);
      btn.style.borderColor=ok?"var(--brand)":"crimson";
      ok?sndCorrect.play():sndWrong.play();
      const {asked,total}=eng._debug();
      nextBtn.style.display=asked<total?"":"none";
      finishBtn.style.display=asked>=total?"":"none";
    });
  });
}

function renderMatch(q){
  let flipped=[],found=0,mistakes=0;
  const totalPairs=q.cards.length/2;
  viewport.innerHTML=`
    <h2 class="q-title">${q.title}</h2>
    <div class="progress"><div id="bar"></div></div>
    <div class="match-grid">
      ${q.cards.map(c=>`
        <button class="card" data-id="${c.id}" data-key="${c.key}">
          <span class="front">?</span>
          <span class="back">${c.face}</span>
        </button>`).join("")}
    </div>
    <div class="muted" style="margin-top:.6rem">Pairs Found:
      <b id="pairsFound">0</b> / ${totalPairs}</div>`;
  const grid=viewport.querySelector(".match-grid"),pf=viewport.querySelector("#pairsFound"),bar=viewport.querySelector("#bar");
  function updateBar(){bar.style.width=`${(found/totalPairs)*100}%`;}

  grid.addEventListener("click",e=>{
    const card=e.target.closest(".card");
    if(!card||card.classList.contains("matched")||card.classList.contains("flipped"))return;
    card.classList.add("flipped");flipped.push(card);
    if(flipped.length===2){
      const[a,b]=flipped,same=a.dataset.key===b.dataset.key;
      if(same){a.classList.add("matched");b.classList.add("matched");found++;pf.textContent=found;updateBar();sndCorrect.play();flipped=[];
        if(found>=totalPairs){
          const sec=Math.floor((Date.now()-t0)/1000);
          eng.submitMatch({pairsFound:found,mistakes,seconds:sec});
          bar.classList.add("glow");
          setTimeout(()=>alert("🎉 All pairs matched!"),600);
          const {asked,total}=eng._debug();
          nextBtn.style.display=asked<total?"":"none";finishBtn.style.display=asked>=total?"":"none";
        }
      }else{
        mistakes++;sndWrong.play();
        setTimeout(()=>{a.classList.remove("flipped");b.classList.remove("flipped");flipped=[];},650);
      }
    }
  });
}

function renderSummary(r){
  viewport.innerHTML=`
    <div style="text-align:center; padding:1.25rem 0">
      <h2 class="h4">Great work! 🎉</h2>
      <p class="muted">You answered <b>${r.correct}/${r.total}</b> correctly in
      <b>${Math.round(r.durationMs/1000)}s</b>.<br>XP earned: <b>${r.xpEarned}</b></p>
      <div style="margin-top:.75rem;display:flex;gap:.5rem;justify-content:center">
        <a class="btn btn--ghost" href="/leaderboard.html">Leaderboard</a>
        <a class="btn btn--brand" href="/game.html">Play Again</a>
      </div></div>`;
  document.querySelector(".controls").style.display="none";
}

startBtn.onclick=async()=>{
  if(!auth.currentUser){alert("Please sign in to play.");location.href="/signin.html";return;}
  eng=await initQuestionEngine({mode:"daily",count:10});
  const dbg=eng._debug();qTotalEl.textContent=dbg.total;startTimer();
  renderQuestion(eng.next(),0,dbg.total);
  startBtn.style.display="none";nextBtn.style.display="";finishBtn.style.display="none";
};
nextBtn.onclick=()=>{const d=eng._debug();if(d.asked<d.total)renderQuestion(eng.next(),d.asked-1,d.total);};
finishBtn.onclick=async()=>{
  stopTimer();const r=eng.results({pro:false});renderSummary(r);
  try{
    const uid=auth.currentUser?.uid;if(!uid)return;
    const ref=doc(db,"users",uid);const snap=await getDoc(ref);const user=snap.data()||{};
    const newXp=(user.xp||0)+r.xpEarned,newStreak=(user.streak||0)+1;
    await updateDoc(ref,{xp:newXp,streak:newStreak});
    const evald=evaluateMilestones({...user,xp:newXp,streak:newStreak,pro:user.pro});
    await persistMilestones(uid,user,evald);
    await syncLeaderboard(uid,{name:user.displayName||"Player",xp:newXp,streak:newStreak,avatarId:user.avatarId||"fox-default",emoji:user.emoji||"🧠"});
    hudScore.textContent=`XP: ${newXp.toLocaleString()}`;
    if(evald.newly.length)alert(`🎉 Unlocked: ${evald.newly.map(m=>m.id).join(", ")}`);
  }catch(e){console.error(e);}
};
