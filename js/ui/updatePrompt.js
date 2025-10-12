/* =========================================================
   Whylee v7 — Update Prompt Toast (for SW updates)
   ========================================================= */
window.WhyleeUpdatePrompt = (() => {
  let el = null;

  function ensure(){
    if (el) return el;
    el = document.createElement('div');
    el.className = 'toast';
    el.style.display = 'none';
    el.innerHTML = `
      <span id="toast-msg"></span>
      <button id="toast-act" class="btn primary">Refresh</button>
    `;
    document.body.appendChild(el);
    return el;
  }

  function show({ message='Update available', action='Refresh', onAction=()=>{} }={}){
    const t = ensure();
    t.querySelector('#toast-msg').textContent = message;
    const btn = t.querySelector('#toast-act');
    btn.textContent = action;
    btn.onclick = () => { hide(); try{ onAction(); }catch{} };
    t.style.display = 'flex';
  }

  function hide(){
    if (!el) return;
    el.style.display = 'none';
  }

  return { show, hide };
})();
