/**
 * Whylee Gameplay (v9, posters integrated)
 * - Mounts HUD AvatarBadge (A)
 * - Runs a session with QuestionEngine
 * - On completion, updates XP/streak + milestones (B)
 * - Shows cinematic posters (success/game-over) (C)
 */

import { auth, db, doc, getDoc, updateDoc } from "/scripts/firebase-bridge.js";
import { mountAvatarBadge } from "/scripts/components/avatarBadge.js";
import { initQuestionEngine } from "/scripts/ai/questionEngine.js";
import { evaluateMilestones, persistMilestones } from "/scripts/milestones.js";
import { showSuccessPoster, showGameOverPoster, showNightPoster, showPoster } from "/scripts/ui/posterManager.js";

// ----- HUD mount (A) ----------------------------------------------------------
const hudScore = document.getElementById("hudScore");
await mountAvatarBadge("#hudUser", { size: 56, uid: auth.currentUser?.uid });

// ----- UI refs ----------------------------------------------------------------
const startBtn  = document.getElementById("startBtn");
const nextBtn   = document.getElementById("nextBtn");
const finishBtn = document.getElementById("finishBtn");
const viewport  = document.getElementById("viewport");
const qIdxEl    = document.getElementById("qIdx");
const qTotalEl  = document.getElementById("qTotal");
const timerEl   = document.getElementById("timer");

// ----- State ------------------------------------------------------------------
let eng = null;
let t0 = 0;            // session start ms
let tickHandle = null; // timer interval

function startTimer(){
  t0 = Date.now();
  stopTimer();
  tickHandle = setInterval(()=> {
    timerEl.textContent = Math.floor((Date.now()-t0)/1000);
  }, 1000);
}
function stopTimer(){ if (tickHandle) { clearInterval(tickHandle); tickHandle=null; } }

// ----- Render helpers ---------------------------------------------------------
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
      const guess = Number(btn.getAttribute("data-i"));
      const timeMs = Date.now() - t0;
      const correct = eng.submit(guess, timeMs); // record result & adapt difficulty
      viewport.querySelectorAll("button[data-i]").forEach(b => b.disabled = true);
      btn.style.borderColor = correct ? "var(--brand)" : "crimson";
      const { asked, total } = eng._debug();
      nextBtn.style.display   = asked < total ? "" : "none";
      finishBtn.style.display = asked >= total ? "" : "none";
    });
  });
}

function renderSummary(r){
  viewport.innerHTML = `
    <div style="text-align:center; padding: 1.25rem 0">
      <h2 class="h4" style="margin:0 0 .5rem">Great work! 🎉</h2>
      <p class="muted">You answered <strong>${r.correct}/${r.total}</strong> correctly in <strong>${Math.round(r.durationMs/1000)}s</strong>.</p>
      <p class="muted">XP earned (client est.): <strong>${r.xpEarned}</strong></p>
      <div style="margin-top: .75rem; display:flex; gap:.5rem; justify-content:center">
        <a class="btn btn--ghost" href="/leaderboard.html">Leaderboard</a>
        <a class="btn btn--brand" href="/game.html">Play Again</a>
      </div>
    </div>
  `;
  document.querySelector(".controls").style.display = "none";
}

// ----- Session lifecycle ------------------------------------------------------
startBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    alert("Please sign in to play.");
    window.location.href = "/signin.html";
    return;
  }

  eng = await initQuestionEngine({ mode: "daily", count: 10 });
  const debug = eng._debug();
  qTotalEl.textContent = debug.total;

  startTimer();

  const q = eng.next();
  renderQuestion(q, 0, debug.total);

  startBtn.style.display = "none";
  nextBtn.style.display = "";
  finishBtn.style.display = "none";
});

nextBtn.addEventListener("click", () => {
  const dbg = eng._debug();
  if (dbg.asked < dbg.total) {
    const q = eng.next();
    renderQuestion(q, dbg.asked - 1, dbg.total);
  }
});

finishBtn.addEventListener("click", async () => {
  stopTimer();

  // Aggregate results (client view)
  const r = eng.results({ pro: false });
  renderSummary(r);

  // --- Posters (C): choose success vs game-over based on score ---------------
  try {
    const pass = r.correct >= Math.ceil(r.total * 0.6);
    if (pass) {
      await showSuccessPoster(); // or: await showPoster("poster-success.jpg", { autoCloseMs: 2400 });
    } else {
      await showGameOverPoster();
    }
  } catch(_) {}

  // ----- Award XP & streak, then run milestones (B) --------------------------
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const user = snap.data() || {};

    const newXp = Math.max(0, Math.round((user.xp || 0) + r.xpEarned));
    const newStreak = (user.streak || 0) + 1;

    await updateDoc(ref, { xp: newXp, streak: newStreak });

    const evald = evaluateMilestones({ ...user, xp: newXp, streak: newStreak, pro: user.pro });
    await persistMilestones(uid, user, evald);

    document.getElementById("hudScore").textContent = `XP: ${newXp.toLocaleString()}`;

    if (evald.newly.length) {
      const names = evald.newly.map(m => m.id.replace(/^(skin|badge|boost):/, "").replace(/-/g," "));
      alert(`🎉 Unlocked: ${names.join(", ")}`);
    }
  } catch (e) {
    console.error(e);
  }
});
