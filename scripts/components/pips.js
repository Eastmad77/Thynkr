// /scripts/components/pips.js
// Lightweight pip row for per-level progress with redemption-aware removal.

export class Pips {
  constructor(rootSel, { total = 10 } = {}) {
    this.root = typeof rootSel === "string" ? document.querySelector(rootSel) : rootSel;
    this.total = total;
    this.pips = [];           // {el, state: 'idle'|'correct'|'wrong'}
    this.wrongStack = [];     // indexes of wrong pips (LIFO for redemption)
    this._render();
  }

  _render() {
    this.root.classList.add("pips");
    this.root.innerHTML = "";
    this.pips.length = 0;
    this.wrongStack.length = 0;
    for (let i = 0; i < this.total; i++) {
      const el = document.createElement("span");
      el.className = "pip pip--idle";
      el.setAttribute("aria-hidden", "true");
      this.root.appendChild(el);
      this.pips.push({ el, state: "idle" });
    }
  }

  reset(total) {
    this.total = total ?? this.total;
    this._render();
  }

  // Mark next pip
  mark(correct) {
    const idx = this.pips.findIndex(p => p.state === "idle");
    if (idx === -1) return;
    const p = this.pips[idx];
    p.state = correct ? "correct" : "wrong";
    p.el.className = `pip ${correct ? "pip--ok" : "pip--bad"}`;
    if (!correct) this.wrongStack.push(idx);
  }

  // Redemption: remove the latest ❌; turns it back to idle then to ok with a flourish
  redeemOne() {
    if (!this.wrongStack.length) return false;
    const idx = this.wrongStack.pop();
    const p = this.pips[idx];
    // pop animation
    p.el.classList.add("pip--redeem");
    // Turn wrong → ok
    p.state = "correct";
    p.el.className = "pip pip--ok pip--redeem";
    // Clean the animation class after it runs
    setTimeout(() => p.el.classList.remove("pip--redeem"), 450);
    return true;
  }
}
