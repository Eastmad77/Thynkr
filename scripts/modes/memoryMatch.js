/**
 * Level 2 — Memory Match (Premium, 5 big pips for pairs + Miss Rail)
 */

import { auth, db, doc, getDoc, updateDoc } from "/scripts/firebase-bridge.js";
import { isPro } from "/scripts/entitlements.js";
import { mountAvatarBadge } from "/scripts/components/avatarBadge.js";
import { createPips, setPipState, addWrongPip, removeOneWrongPip } from "/scripts/components/pips.js";
import { mountStreakBar, streakSet, streakPulseGold, streakPulseError, streakRedeem } from "/scripts/ui/streakBar.js";

const sfx = {
  click:   new Audio("/sfx/click.mp3"),
  right:   new Audio("/sfx/correct.mp3"),
  wrong:   new Audio("/sfx/wrong.mp3"),
  levelup: new Audio("/sfx/levelup.mp3")
};
Object.values(sfx).forEach(a => (a.volume = 0.7));

const board   = document.getElementById("board");
const timerEl = document.getElementById("timer");
const scoreEl = document.getElementById("hudScore");
const restart = document.getElementById("restartBtn");

let t0 = 0, tickHandle = null;
function startTimer(){ t0 = Date.now(); stopTimer(); tickHandle = setInterval(()=> timerEl.textContent = Math.floor((Date.now()-t0)/1000), 1000); }
function stopTimer(){ if (tickHandle) { clearInterval(tickHandle); tickHandle=null; } }

const TOTAL_PAIRS = 5;
let deck = [];
let open = [];
let matchedPairs = 0;
let correctStreak = 0;  // for redemption
let missCount = 0;      // miss rail count
let proUser = false;

await mountAvatarBadge("#hudUser", { size: 56, uid: auth.currentUser?.uid });
mountStreakBar("#streakFill");

// Big 5 pips (pairs), and compact miss rail (max 10 beads)
createPips("#hudPips", TOTAL_PAIRS, { size: "lg" });
createPips("#hudMiss", 10, { size: "sm", inactive: true });

proUser = await isPro(auth.currentUser?.uid);

setup();
startTimer();

restart.addEventListener("click", () => { sfx.click.play(); setup(true); });

function setup(resetHud=false){
  const pool = ["🐶","🦊","🐼","🐨","🐯","🐵","🦉","🐸","🦄","🐙","🐳","🛰️","🚀","⭐","⚡"];
  const items = shuffle(pool).slice(0, TOTAL_PAIRS);
  deck = shuffle([...items, ...items]).map((e,i)=>({ id:i, emoji:e, flipped:false, done:false }));
  open.length = 0;
  matchedPairs = 0;
  correctStreak = 0;
  missCount = 0;

  if (resetHud){
    createPips("#hudPips", TOTAL_PAIRS, { size: "lg" });
    createPips("#hudMiss", 10, { size: "sm", inactive: true });
    streakSet(0, TOTAL_PAIRS); // streak bar mapped to pairs now
  }

  render();
  scoreSync();
}

function render(){
  board.innerHTML = deck.map(cardHtml).join("");
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
        <div class="mm-face mm-back"><span class="mm-emoji">${c.emoji}</span></div>
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

  // Update streak bar to indicate progress toward next pair
  streakSet(matchedPairs + (open.length === 2 ? 1 : 0), TOTAL_PAIRS);

  if (open.length === 2){
    board.style.pointerEvents = "none";
    await sleep(420);

    const [a,b] = open;
    const ca = deck[a], cb = deck[b];

    if (ca.emoji === cb.emoji){
      // match
      ca.done = cb.done = true;
      matchedPairs++;
      correctStreak++;
      sfx.right.currentTime = 0; sfx.right.play();

      setPipState("#hudPips", matchedPairs, "good");
      if (proUser) streakPulseGold("#streakFill");

      // Redemption: 3 in a row removes one miss bead
      if (correctStreak >= 3 && missCount > 0){
        missCount--;
        removeOneWrongPip("#hudMiss");
        streakRedeem("#streakFill");
      }

      if (matchedPairs === TOTAL_PAIRS){
        stopTimer();
        sfx.levelup.play();
        winBanner();
        await awardXpAndStreak();
      }
    } else {
      // mismatch
      correctStreak = 0;
      missCount++;
      addWrongPip("#hudMiss");
      sfx.wrong.currentTime = 0; sfx.wrong.play();
      streakPulseError("#streakFill");

      ca.flipped = cb.flipped = false;
      board.querySelector(`.mm-card[data-i="${a}"]`)?.classList.remove("flipped");
      board.querySelector(`.mm-card[data-i="${b}"]`)?.classList.remove("flipped");
    }

    open = [];
    board.style.pointerEvents = "";
  }
}

function winBanner(){
  const el = document.createElement("div");
  el.className = "win-banner";
  el.innerHTML = `<h2>All pairs found! 🎉</h2>`;
  board.insertAdjacentElement("beforebegin", el);
}

async function awardXpAndStreak(){
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const user = snap.data() || {};

    const timeSec = Math.max(1, Math.floor((Date.now()-t0)/1000));
    const base = 120 + (TOTAL_PAIRS * 25);
    const speed = Math.max(0, 60 - timeSec) * 2;
    const earned = base + speed;

    const newXp = Math.max(0, Math.round((user.xp || 0) + earned));
    const newStreak = (user.streak || 0) + 1;

    await updateDoc(ref, { xp: newXp, streak: newStreak });
    scoreEl.textContent = `XP: ${newXp.toLocaleString()}`;
  } catch (e) { console.error(e); }
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

function shuffle(arr){ for (let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];} return arr; }
const sleep = ms => new Promise(r => setTimeout(r, ms));
