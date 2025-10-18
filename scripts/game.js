/**
 * Whylee Gameplay (v9.3, Premium)
 * - Cinematic HUD with AvatarBadge
 * - Streak Bar via createStreakBar() + pips per question
 * - Redemption: 3 correct in a row removes one wrong pip and flashes gold
 * - XP + streak updates and milestone evaluation on finish
 */

import { auth, db, doc, getDoc, updateDoc } from "/scripts/firebase-bridge.js";
import { mountAvatarBadge } from "/scripts/components/avatarBadge.js";
import { initQuestionEngine } from "/scripts/ai/questionEngine.js";
import { evaluateMilestones, persistMilestones } from "/scripts/milestones.js";
import { createStreakBar } from "/scripts/ui/streakBar.js";
import { initPips, markPip, clearPips } from "/scripts/components/pips.js";
import { isPro } from "/scripts/entitlements.js";

// ----- HUD mount --------------------------------------------------------------
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

let currentIndex = 0;
let totalQuestions = 10;
let correctInARow = 0;
let wrongHistory = [];   // indexes of wrong answers (for redemption)
let proUser = false;

// Streak bar controller (uses #streakFill element)
const streak = createStreakBar({ root: "#streakFill", pro: false, total: totalQuestions });

// ----- Helpers ----------------------------------------------------------------
async function primeUser() {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    proUser = await isPro(uid);
    streak.setProMode(proUser);
    // Score preload
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const user = snap.data() || {};
    hudScore.textContent = `XP: ${(user.xp || 0).toLocaleString()}`;
  } catch (e) {
    console.warn("primeUser()", e);
  }
}

function startTimer(){
  t0 = Date.now();
  stopTimer();
  tickHandle = setInterval(()=> {
    timerEl.textContent = Math.floor((Date.now()-t0)/1000);
  }, 1000);
}
function stopTimer(){ if (tickHandle) { clearInterval(tickHandle); tickHandle=null; } }

function resetSessionUi() {
  correctInARow = 0;
  wrongHistory = [];
  currentIndex = 0;
  clearPips();
  initPips(totalQuestions);
  streak.setTotal(totalQuestions);
  streak.setIndex(0);
  qIdxEl.textContent = "0";
  qTotalEl.textContent = totalQuestions;
  nextBtn.style.display   = "none";
  finishBtn.style.display = "none";
}

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
    btn.addEventListener("click", () => onAnswer(btn, q));
  });
}

function onAnswer(btn, qObj) {
  // disable all buttons to lock in the choice
  viewport.querySelectorAll("button[data-i]").forEach(b => b.disabled = true);

  const guess = Number(btn.getAttribute("data-i"));
  const timeMs = Date.now() - t0; // per-question time (client)
  const correct = eng.submit(guess, timeMs); // record result & adapt difficulty

  // Visual feedback on button
  btn.style.borderColor = correct ? "var(--brand)" : "crimson";

  // Update pip for this question
  if (correct) {
    markPip(currentIndex, "correct");
    correctInARow += 1;
    // Redemption: after 3 correct in a row, redeem one wrong if exists
    if (correctInARow >= 3 && wrongHistory.length) {
      const redeemedIdx = wrongHistory.pop();
      markPip(redeemedIdx, "redeemed");
      streak.redeemOne(); // triggers gold flash
      correctInARow = 0;  // reset streak for next redemption chain
    }
  } else {
    markPip(currentIndex, "wrong");
    wrongHistory.push(currentIndex);
    correctInARow = 0;
  }

  // Advance streak bar one step (regardless of correctness)
  streak.mark(correct);

  // Show next/finish
  const { asked, total } = eng._debug();
  nextBtn.style.display   = asked < total ? "" : "none";
  finishBtn.style.display = asked >= total ? "" : "none";
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
startBtn?.addEventListener("click", async () => {
  // Require sign-in
  if (!auth.currentUser) {
    alert("Please sign in to play.");
    window.location.href = "/signin.html";
    return;
  }

  await primeUser();

  // Build engine
  eng = await initQuestionEngine({ mode: "daily", count: totalQuestions });
  const debug = eng._debug();
  totalQuestions = debug.total;
  qTotalEl.textContent = debug.total;

  // Reset HUD trackers
  resetSessionUi();

  // Timer for session
  startTimer();

  // First question
  const q = eng.next();
  currentIndex = 0;
  renderQuestion(q, currentIndex, debug.total);

  // Buttons
  startBtn.style.display = "none";
  nextBtn.style.display = "";
  finishBtn.style.display = "none";
});

nextBtn?.addEventListener("click", () => {
  const dbg = eng._debug();
  if (dbg.asked < dbg.total) {
    const q = eng.next();
    currentIndex = dbg.asked - 1; // eng.asked incremented by eng.next()
    renderQuestion(q, currentIndex, dbg.total);
  }
});

finishBtn?.addEventListener("click", async () => {
  stopTimer();

  // Aggregate results (client view)
  const r = eng.results({ pro: !!proUser }); // server remains source of truth
  renderSummary(r);

  // ----- Award XP & streak, then run milestones ------------------------------
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const user = snap.data() || {};

    const newXp = Math.max(0, Math.round((user.xp || 0) + r.xpEarned));
    const newStreak = (user.streak || 0) + 1;

    await updateDoc(ref, { xp: newXp, streak: newStreak });

    // Evaluate milestones & persist new unlocks
    const evald = evaluateMilestones({ ...user, xp: newXp, streak: newStreak, pro: user.pro || proUser });
    await persistMilestones(uid, user, evald);

    // Update HUD XP text
    hudScore.textContent = `XP: ${newXp.toLocaleString()}`;

    if (evald.newly?.length) {
      const names = evald.newly.map(m => m.id.replace(/^(skin|badge|boost):/, "").replace(/-/g," "));
      alert(`🎉 Unlocked: ${names.join(", ")}`);
    }
  } catch (e) {
    console.error(e);
  }
});

// ----- Initial prime if user is already logged in ----------------------------
primeUser().catch(()=>{});
