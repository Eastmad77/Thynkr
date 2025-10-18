/**
 * Level 2 — Memory Match (Premium)
 * - 5 pairs (10 cards)
 * - Streak pips mirror quiz HUD:
 *     • green pip for correct pair
 *     • red pip for mismatch
 *     • redemption: 3 consecutives remove one red pip
 * - Pro glow & sweep accents via isPro(uid)
 */

import { auth, db, doc, getDoc, updateDoc } from "/scripts/firebase-bridge.js";
import { isPro } from "/scripts/entitlements.js";
import { mountAvatarBadge } from "/scripts/components/avatarBadge.js";
import { createPips, setPipState, removeOneWrongPip } from "/scripts/components/pips.js";
import { mountStreakBar, streakSet, streakPulseGold, streakPulseError, streakRedeem } from "/scripts/ui/streakBar.js";

// ---- sound helpers (re-use if already loaded) --------------------------------
const sfx = {
  click:   new Audio("/sfx/click.mp3"),
  right:   new Audio("/sfx/correct.mp3"),
  wrong:   new Audio("/sfx/wrong.mp3"),
  levelup: new Audio("/sfx/levelup.mp3")
};
Object.values(sfx).forEach(a => { a.volume = 0.7; });

const board   = document.getElementById("board");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("hudScore");
const restart = document.getElementById("restartBtn");

let t0 = 0, tickHandle = null;
function startTimer(){ t0 = Date.now(); stopTimer(); tickHandle = setInterval(()=> timerEl.textContent = Math.floor((Date.now()-t0)/1000), 1000); }
function stopTimer(){ if (tickHandle) { clearInterval(tickHandle); tickHandle=null; } }

// Session state
const TOTAL_PAIRS = 5;     // ← premium asks 5 pairs
let deck = [];
let open = [];             // indexes of flipped-not-matched
let matched = new Set();   // matched indices
let correctStreak = 0;     // for redemption
let wrongPips = 0;         // count of red pips
let proUser = false;

// HUD mount
await mountAvatarBadge("#hudUser", { size: 56, uid: auth.currentUser?.uid });
createPips("#hudPips", TOTAL_PAIRS * 2); // 10 pips = each card action OR set to TOTAL_PAIRS for per-pair pips
mountStreakBar("#streakFill");

// Determine Pro look
proUser = await isPro(auth.currentUser?.uid);

// Init
setup();
startTimer();

restart.addEventListener("click", () => {
  sfx.click.play();
  setup(true);
});

function setup(resetHUD=false){
  // Emoji pool (distinct & readable)
  const pool = ["🐶","🦊","🐼","🐨","🐯","🐵","🦉","🐸","🦄","🐙","🐳","🛰️","🚀","⭐","⚡"];
  const items = shuffle(pool).slice(0, TOTAL_PAIRS);
  deck = shuffle([...items, ...items]).map((e,i) => ({ id:i, emoji:e, flipped:false, done:false }));
  open = []; matched.clear(); correctStreak = 0; wrongPips = 0;

  if (resetHUD){
    // Reset pips + streak HUD
    createPips("#hudPips", TOTAL_PAIRS * 2);
    streakSet(0, TOTAL_PAIRS * 2);
  }

  render();
  scoreSync(); // show XP on HUD
}

function render(){
  board.innerHTML = deck.map(card => cardHtml(card)).join("");
  board.querySelectorAll(".mm-card").forEach(el => {
    const idx = Number(el.dataset.i);
    el.addEventListener("click", () => onClick(idx, el));
  });
}

function cardHtml(c){
  const cls = ["mm-card"];
  if (c.flipped || c.done) cls.push("flipped");
  if (c.done) cls.push("matched");
  if (proUser) cls.push("pro");
  return `
    <div class="${cls.join(" ")}" data-i="${c.id}" aria-label="Card">
      <div class="mm-inner">
        <div class="mm-face mm-front"></div>
        <div class="mm-face mm-back">
          <span class="mm-emoji">${c.emoji}</span>
        </div>
      </div>
    </div>
  `;
}

async function onClick(idx, el){
  const c = deck[idx];
  if (c.done || c.flipped) return;
  sfx.click.play();

  c.flipped = true;
  el.classList.add("flipped");

  open.push(idx);
  setPipState("#hudPips", open.length + matched.size, "pending"); // soft cyan

  if (open.length === 2){
    // lock input briefly
    board.style.pointerEvents = "none";
    await sleep(420);

    const [a,b] = open;
    const ca = deck[a], cb = deck[b];

    if (ca.emoji === cb.emoji){
      // match
      ca.done = cb.done = true;
      matched.add(a); matched.add(b);
      correctStreak++;
      sfx.right.currentTime = 0; sfx.right.play();

      setPipState("#hudPips", matched.size, "good"); // green step
      streakSet(matched.size, TOTAL_PAIRS * 2);

      if (proUser) streakPulseGold("#streakFill");

      if (matched.size === TOTAL_PAIRS * 2){
        // win
        stopTimer();
        sfx.levelup.play();
        winBanner();
        await awardXpAndStreak();
      }
    } else {
      // mismatch
      c.flipped = false; deck[a].flipped = false;
      board.querySelector(`.mm-card[data-i="${a}"]`)?.classList.remove("flipped");
      board.querySelector(`.mm-card[data-i="${b}"]`)?.classList.remove("flipped");
      correctStreak = 0;

      wrongPips++;
      sfx.wrong.currentTime = 0; sfx.wrong.play();
      setPipState("#hudPips", matched.size + wrongPips, "bad"); // red pip after matched count
      streakPulseError("#streakFill");

      // redemption rule: 3 in a row will trigger separately on later matches
    }

    open = [];
    board.style.pointerEvents = "";
  } else {
    // first of a pair clicked
    streakSet(matched.size + 1, TOTAL_PAIRS * 2);
  }
}

function winBanner(){
  const el = document.createElement("div");
  el.className = "win-banner";
  el.innerHTML = `<h2>All pairs found! 🎉</h2>`;
  board.insertAdjacentElement("beforebegin", el);
}

// Called after each successful match; check redemption
function maybeRedeem(){
  if (correctStreak >= 3 && wrongPips > 0){
    wrongPips--;
    removeOneWrongPip("#hudPips");   // visually remove last red pip
    streakRedeem("#streakFill");     // teal → gold pulse
  }
}

// XP + streak logic (shared shape with quiz mode)
async function awardXpAndStreak(){
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const user = snap.data() || {};

    const timeSec = Math.max(1, Math.floor((Date.now()-t0)/1000));
    const base = 100 + (TOTAL_PAIRS * 20);         // base reward
    const speed = Math.max(0, 60 - timeSec) * 2;   // early finish bonus
    const earned = base + speed;                    // client-side display only

    const newXp = Math.max(0, Math.round((user.xp || 0) + earned));
    const newStreak = (user.streak || 0) + 1;

    await updateDoc(ref, { xp: newXp, streak: newStreak });

    scoreEl.textContent = `XP: ${newXp.toLocaleString()}`;
  } catch (e) {
    console.error(e);
  }
}

async function scoreSync(){
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const user = snap.data() || {};
    scoreEl.textContent = `XP: ${(user.xp||0).toLocaleString()}`;
  } catch {}
}

// utilities
function shuffle(arr){ for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Hook redemption check after each render cycle
const mo = new MutationObserver(()=> {
  // whenever matched grows, try redemption
  maybeRedeem();
});
mo.observe(board, { childList:true, subtree:true });
