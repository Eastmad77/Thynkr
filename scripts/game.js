/**
 * Whylee Gameplay (Premium Edition)
 * - Cinematic Pro streak system
 * - XP/streak + milestones with redemption visuals
 */

import { auth, db, doc, getDoc, updateDoc } from "/scripts/firebase-bridge.js";
import { mountAvatarBadge } from "/scripts/components/avatarBadge.js";
import { initQuestionEngine } from "/scripts/ai/questionEngine.js";
import { evaluateMilestones, persistMilestones } from "/scripts/milestones.js";
import { createStreakBar } from "/scripts/ui/streakBar.js";
import { Pips } from "/scripts/components/pips.js";
import { isPro } from "/scripts/entitlements.js";

const hudScore = document.getElementById("hudScore");
await mountAvatarBadge("#hudUser", { size: 56, uid: auth.currentUser?.uid });

// UI references
const startBtn  = document.getElementById("startBtn");
const nextBtn   = document.getElementById("nextBtn");
const finishBtn = document.getElementById("finishBtn");
const viewport  = document.getElementById("viewport");
const qIdxEl    = document.getElementById("qIdx");
const qTotalEl  = document.getElementById("qTotal");
const timerEl   = document.getElementById("timer");

// Streak visuals
const streak = createStreakBar({ root: "#streakFill", pro: await isPro(auth.currentUser?.uid), total: 10 });
const pips = new Pips("#hudPips", { total: 10 });

// Sound effects
const sfx = {
  correct: new Audio("/media/audio/correct.mp3"),
  wrong: new Audio("/media/audio/wrong.mp3"),
  click: new Audio("/media/audio/soft-click.mp3"),
  levelUp: new Audio("/media/audio/level-up.mp3"),
};

let eng = null, t0 = 0, tickHandle = null;
let correctInRow = 0, wrongCount = 0;

function startTimer(){
  t0 = Date.now();
  stopTimer();
  tickHandle = setInterval(()=>timerEl.textContent=Math.floor((Date.now()-t0)/1000),1000);
}
function stopTimer(){ if(tickHandle){ clearInterval(tickHandle); tickHandle=null; } }

function renderQuestion(q, index, total){
  qIdxEl.textContent = index+1;
  qTotalEl.textContent = total;
  viewport.innerHTML = `
    <h2 class="q-title">${q.q}</h2>
    <div class="answers">
      ${q.choices.map((label,i)=>`<button data-i="${i}">${label}</button>`).join("")}
    </div>
    <p class="muted" style="margin-top:.5rem">Pick one answer</p>
  `;

  viewport.querySelectorAll("button[data-i]").forEach(btn=>{
    btn.addEventListener("click", () => {
      sfx.click.play().catch(()=>{});
      const guess = Number(btn.getAttribute("data-i"));
      const timeMs = Date.now() - t0;
      const correct = eng.submit(guess, timeMs);

      viewport.querySelectorAll("button[data-i]").forEach(b=>b.disabled=true);
      btn.style.borderColor = correct ? "var(--brand)" : "crimson";

      if(correct){
        correctInRow++; pips.mark(true); streak.mark(true);
        sfx.correct.play().catch(()=>{});
        if(correctInRow>=3 && wrongCount>0){
          if(pips.redeemOne()||streak.redeemOne()){
            wrongCount=Math.max(0,wrongCount-1);
            sfx.levelUp.play().catch(()=>{});
          }
          correctInRow=0;
        }
      }else{
        correctInRow=0; wrongCount++; pips.mark(false); streak.mark(false);
        sfx.wrong.play().catch(()=>{});
      }

      const { asked, total } = eng._debug();
      nextBtn.style.display = asked<total ? "" : "none";
      finishBtn.style.display = asked>=total ? "" : "none";
    });
  });
}

function renderSummary(r){
  viewport.innerHTML = `
    <div style="text-align:center; padding:1.25rem 0">
      <h2 class="h4" style="margin:0 0 .5rem">Great work! 🎉</h2>
      <p class="muted">You answered <strong>${r.correct}/${r.total}</strong> correctly in <strong>${Math.round(r.durationMs/1000)}s</strong>.</p>
      <p class="muted">XP earned (est.): <strong>${r.xpEarned}</strong></p>
      <div style="margin-top:.75rem; display:flex; gap:.5rem; justify-content:center">
        <a class="btn btn--ghost" href="/leaderboard.html">Leaderboard</a>
        <a class="btn btn--brand" href="/game.html">Play Again</a>
      </div>
    </div>`;
  document.querySelector(".controls").style.display="none";
}

startBtn.addEventListener("click", async ()=>{
  if(!auth.currentUser){ alert("Please sign in to play."); window.location.href="/signin.html"; return; }

  eng=await initQuestionEngine({ mode:"daily", count:10 });
  const dbg=eng._debug();
  qTotalEl.textContent=dbg.total;
  correctInRow=0; wrongCount=0; pips.reset(dbg.total); streak.setTotal(dbg.total); streak.setIndex(0);
  startTimer();

  renderQuestion(eng.next(),0,dbg.total);
  startBtn.style.display="none"; nextBtn.style.display=""; finishBtn.style.display="none";
});

nextBtn.addEventListener("click",()=>{
  const dbg=eng._debug();
  if(dbg.asked<dbg.total) renderQuestion(eng.next(),dbg.asked-1,dbg.total);
});

finishBtn.addEventListener("click", async ()=>{
  stopTimer();
  const r=eng.results({ pro: await isPro(auth.currentUser?.uid) });
  renderSummary(r);

  try{
    const uid=auth.currentUser?.uid; if(!uid)return;
    const ref=doc(db,"users",uid);
    const snap=await getDoc(ref);
    const user=snap.data()||{};
    const newXp=Math.round((user.xp||0)+r.xpEarned);
    const newStreak=(user.streak||0)+1;
    await updateDoc(ref,{ xp:newXp, streak:newStreak });
    const evald=evaluateMilestones({ ...user, xp:newXp, streak:newStreak, pro:user.pro });
    await persistMilestones(uid,user,evald);
    hudScore.textContent=`XP: ${newXp.toLocaleString()}`;
    if(evald.newly.length){
      const names=evald.newly.map(m=>m.id.replace(/^(skin|badge|boost):/,"").replace(/-/g," "));
      alert(`🎉 Unlocked: ${names.join(", ")}`);
    }
  }catch(e){ console.error(e); }
});
