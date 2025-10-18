// /scripts/ui/streakBar.js
// Premium animated streak bar controller (Pro-ready, redemption-aware)

export function createStreakBar(opts = {}) {
  const { root = "#streakFill", pro = false, total = 10 } = opts;
  const el = typeof root === "string" ? document.querySelector(root) : root;
  if (!el) throw new Error("[streakBar] Root element not found.");

  let _index = 0;
  let _total = total;
  let wrongStack = [];

  el.classList.toggle("pro", !!pro);

  function widthFor(idx) {
    return `${Math.min(100, (idx / _total) * 100)}%`;
  }

  function animateWidth(prev, next) {
    el.style.setProperty("--wl-streak-prev", prev);
    el.style.setProperty("--wl-streak-next", next);
    el.style.width = next;
  }

  function setIndex(i) {
    _index = Math.max(0, Math.min(_total, i));
    animateWidth(el.style.width || "0%", widthFor(_index));
  }

  function setTotal(t) {
    _total = Math.max(1, t | 0);
    setIndex(_index);
  }

  function mark(correct) {
    const prev = el.style.width || "0%";
    const nextIdx = Math.min(_total, _index + 1);
    const next = widthFor(nextIdx);
    animateWidth(prev, next);
    if (!correct) wrongStack.push(nextIdx - 1);
    _index = nextIdx;
  }

  function redeemOne() {
    if (!wrongStack.length) return false;
    wrongStack.pop();
    el.classList.add("redeem");
    setTimeout(() => el.classList.remove("redeem"), 520);
    return true;
  }

  function setProMode(flag) {
    el.classList.toggle("pro", !!flag);
  }

  return { el, setIndex, setTotal, mark, redeemOne, setProMode };
}
