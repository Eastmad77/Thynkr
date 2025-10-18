// /scripts/ui/streakBar.js
// Premium streak controller with redemption pulse & Pro glow.
// Usage:
//   import { createStreakBar } from "/scripts/ui/streakBar.js";
//   const streak = createStreakBar({ root: "#streakFill", pro: isPro, total: 12 });
//   streak.setIndex(0); streak.mark(true/false); streak.redeemOne();

export function createStreakBar(opts = {}) {
  const {
    root = "#streakFill",
    pro = false,
    total = 12
  } = opts;

  const el = typeof root === "string" ? document.querySelector(root) : root;
  if (!el) throw new Error("[streakBar] root element not found");

  if (pro) el.classList.add("pro"); else el.classList.remove("pro");

  let _index = 0;        // next slot (0..total)
  let _total = total;
  let wrongStack = [];   // store indices of wrong answers for redemption

  function widthFor(idx) {
    const pct = Math.max(0, Math.min(100, (idx / _total) * 100));
    return `${pct}%`;
  }

  function animateWidth(prev, next) {
    // Smooth width change; CSS handles base transition.
    el.style.setProperty("--wl-streak-prev", prev);
    el.style.setProperty("--wl-streak-next", next);
    el.style.width = next;
  }

  function setIndex(i) {
    _index = Math.max(0, Math.min(_total, i));
    animateWidth(el.style.width || "0%", widthFor(_index));
  }

  function setTotal(t) {
    _total = Math.max(1, t|0);
    setIndex(_index); // recompute width
  }

  function mark(correct) {
    const prev = el.style.width || "0%";
    const nextIdx = Math.min(_total, _index + 1);
    const next = widthFor(nextIdx);
    animateWidth(prev, next);

    if (!correct) wrongStack.push(nextIdx - 1);
    _index = nextIdx;
  }

  // Visually forgive the latest ❌ (no index rewind; UX-only pop)
  function redeemOne() {
    if (!wrongStack.length) return false;
    wrongStack.pop(); // pop the last wrong index
    el.classList.add("redeem");
    setTimeout(() => el.classList.remove("redeem"), 520);
    return true;
  }

  function setProMode(flag) {
    el.classList.toggle("pro", !!flag);
  }

  return { el, setIndex, setTotal, mark, redeemOne, setProMode };
}
