/**
 * Simple pip rail
 * createPips(target, count, { size: 'lg'|'sm', inactive: boolean })
 * setPipState(target, index, state) state: 'empty'|'pending'|'good'|'bad'
 * addWrongPip(target) -> adds a red bead at next empty slot (for miss rail)
 * removeOneWrongPip(target) -> removes last red bead
 */

export function createPips(target, count, opts = {}) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  el.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "pip";
    if (opts.inactive) p.dataset.state = "empty";
    el.appendChild(p);
  }
}

export function setPipState(target, index, state) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  const pips = [...el.querySelectorAll(".pip")];
  const p = pips[Math.max(0, Math.min(index - 1, pips.length - 1))];
  if (!p) return;
  p.dataset.state = state;
  // style via inline to avoid extra CSS file
  stylePip(p);
}

export function addWrongPip(target){
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  const p = [...el.querySelectorAll(".pip")].find(x => !x.dataset.state || x.dataset.state === "empty");
  if (!p) return;
  p.dataset.state = "bad";
  stylePip(p);
}

export function removeOneWrongPip(target){
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  const pips = [...el.querySelectorAll(".pip")];
  const p = [...pips].reverse().find(x => x.dataset.state === "bad");
  if (!p) return;
  p.dataset.state = "empty";
  stylePip(p);
}

function stylePip(p){
  const st = p.dataset.state || "empty";
  const base = "0 0 0 1px rgba(255,255,255,.12)";
  if (st === "good"){
    p.style.background = "linear-gradient(180deg,#34F5C6,#03C5FF)";
    p.style.boxShadow = "0 0 18px rgba(0,232,255,.45)";
  } else if (st === "bad"){
    p.style.background = "linear-gradient(180deg,#F66,#C0152B)";
    p.style.boxShadow = "0 0 14px rgba(255,64,64,.45)";
  } else if (st === "pending"){
    p.style.background = "linear-gradient(180deg,#CFF5FF,#7AE0FF)";
    p.style.boxShadow = "0 0 10px rgba(0,232,255,.25)";
  } else {
    p.style.background = "transparent";
    p.style.boxShadow = base;
  }
}
