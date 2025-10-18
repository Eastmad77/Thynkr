// /scripts/components/pips.js
// Premium pips with redemption pop; companion for streakBar

export class Pips {
  constructor(rootSel, { total = 10, large = false } = {}) {
    this.root = typeof rootSel === "string" ? document.querySelector(rootSel) : rootSel;
    if (!this.root) throw new Error("[Pips] root not found");
    this.total = total;
    this.large = large;
    this.pips = [];
    this.wrongs = [];
    this._render();
  }

  _render() {
    this.root.classList.add("pips");
    this.root.classList.toggle("pips--lg", !!this.large);
    this.root.innerHTML = "";
    this.pips.length = 0;
    this.wrongs.length = 0;
    for (let i = 0; i < this.total; i++) {
      const el = document.createElement("span");
      el.className = "pip";
      this.root.appendChild(el);
      this.pips.push({ el, state: "idle" });
    }
  }

  reset(total) {
    if (typeof total === "number") this.total = total;
    this._render();
  }

  mark(ok) {
    const idx = this.pips.findIndex(p => p.state === "idle");
    if (idx === -1) return;
    const p = this.pips[idx];
    p.state = ok ? "ok" : "bad";
    p.el.className = `pip ${ok ? "pip--ok" : "pip--bad"}`;
    if (!ok) this.wrongs.push(idx);
  }

  redeemOne() {
    if (!this.wrongs.length) return false;
    const idx = this.wrongs.pop();
    const p = this.pips[idx];
    p.state = "ok";
    p.el.className = "pip pip--ok pip--redeem";
    setTimeout(() => p.el.classList.remove("pip--redeem"), 450);
    return true;
  }
}
