/**
 * Whylee Gameplay (v8+ MATCH-ready)
 * - Mounts HUD
 * - Renders MCQ and MATCH (5 pairs)
 * - Updates XP/streak, runs milestones, syncs leaderboard
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

let eng = null;
let t0 = 0;
let tickHandle = null;

function startTimer(){
  t0 = Date.now();
  stopTimer();
  tickHandle = setInterval(()=> {
    timerEl.textContent = Math.floor((Date.now()-t0)/1000);
  }, 1000);
}
function stopTimer(){ if (tickHandle) { clearInterval(tickHandle); tickHandle=null; } }

function renderQuestion(q, index, total){
  qIdxEl.textContent = index+1;
  qTotalEl.textContent = total;

  if (q.type === "match") return renderMatch(q);

  // MCQ
  viewport.innerHTML = `
    <h2 class="q-title">${q.q}</h2>
    <div class="answers">
      ${q.choices.map((label,i)=>`<button class="btn-answer" data-i="${i}">${label}</button>`).join("")}
    </div>
    <p class="muted" style="margin-top:.5rem">Pick one answer</p>
  `;
  viewport.querySelectorAll(".btn-answer").forEach(btn=>{
    btn.addEventListener("click", () => {
      const guess = Number(btn.getAttribute("data-i"));
      const timeMs = Date.now() - t0;
      const correct = eng.submit(guess, timeMs);
      viewport.querySelectorAll(".btn-answer").forEach(b => b.disabled = true);
      btn.style.borderColor = correct ? "var(--brand)" : "crimson";
      const { asked, total } = eng._debug();
      nextBtn.style.display   = asked < total ? "" : "none";
      finishBtn.style.display = asked >= total ? "" : "none";
    });
  });
}

function renderMatch(q) {
  // Build the 5-pair grid
  let flipped = [];
  let found = 0;
  let mistakes = 0;
  const totalPairs = q.cards.length / 2;

  viewport.innerHTML = `
    <h2 class="q-title">${q.title}</h2>
    <p class="muted" style="margin:.25rem 0 .8rem">${q.subtitle}</p>
    <div class="match-grid">
      ${q.cards.map(c => `
        <button class="card" data-id="${c.id}" data-key="${c.key}">
          <span class="front">?</span>
          <span class="back">${c.face}</span>
        </button>
      `).join("")}
    </div>
    <div class="muted" style="margin-top:.6rem">Pairs found: <b id="pairsFound">0</b> / ${totalPairs}</div>
  `;

  const grid = viewport.querySelector(".match-grid");
  const pf = viewport.querySelector("#pairsFound");

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card || card.classList.contains("matched") || card.classList.contains("flipped")) return;

    // flip
    card.classList.add("flipped");
    flipped.push(card);

    if (flipped.length === 2) {
      const [a, b] = flipped;
      const same = a.dataset.key === b.dataset.key;

      if (same) {
        a.classList.add("matched");
        b.classList.add("matched");
        found += 1;
        pf.textContent = String(found);
        flipped = [];
        if (found >= totalPairs) {
          // finish round → submitMatch
          const seconds = Math.floor((Date.now() - t0)/1000);
          const res = eng.submitMatch({ pairsFound: found, mistakes, seconds });
          // show next/finish
          const { asked, total } = eng._debug();
          nextBtn.style.display   = asked < total ? "" : "none";
          finishBtn.style.display = asked >= total ? "" : "none";
        }
      } else {
        mistakes += 1;
        // brief delay then flip back
        setTimeout(() => {
          a.classList.remove("flipped");
          b.classList.remove("flipped");
          flipped = [];
        }, 650);
      }
    }
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
  const r = eng.results({ pro: false });
  renderSummary(r);

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

    await syncLeaderboard(uid, {
      name: user.displayName || "Player",
      xp: newXp,
      streak: newStreak,
      avatarId: user.avatarId || "fox-default",
      emoji: user.emoji || "🧠"
    });

    document.getElementById("hudScore").textContent = `XP: ${newXp.toLocaleString()}`;

    if (evald.newly.length) {
      const names = evald.newly.map(m => m.id.replace(/^(skin|badge|boost):/, "").replace(/-/g," "));
      alert(`🎉 Unlocked: ${names.join(", ")}`);
    }
  } catch (e) {
    console.error(e);
  }
});
