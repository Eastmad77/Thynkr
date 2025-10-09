(function(){
  const btnMenu = document.getElementById('btnMenu');
  const btnCloseMenu = document.getElementById('btnCloseMenu');
  const sideMenu = document.getElementById('sideMenu');
  const scrim = document.getElementById('menuScrim');
  const btnSound = document.getElementById('btnSound');

  function openMenu(){
    sideMenu?.setAttribute('aria-hidden','false');
    scrim && (scrim.hidden = false);
  }
  function closeMenu(){
    sideMenu?.setAttribute('aria-hidden','true');
    scrim && (scrim.hidden = true);
  }

  btnMenu?.addEventListener('click', openMenu);
  btnCloseMenu?.addEventListener('click', closeMenu);
  scrim?.addEventListener('click', closeMenu);

  // Sound toggle (stores preference)
  const key='wl_sound_on';
  function refreshIcon(){
    const on = localStorage.getItem(key)!=='0';
    btnSound?.setAttribute('data-state', on?'on':'off');
    btnSound && (btnSound.textContent = on?'🔊':'🔈');
  }
  btnSound?.addEventListener('click', ()=>{
    const on = localStorage.getItem(key)!=='0';
    localStorage.setItem(key, on?'0':'1');
    refreshIcon();
  });

  // Global hook to respect sound preference
  const _Audio = window.Audio;
  window.Audio = function(src){
    const a = new _Audio(src);
    const on = localStorage.getItem(key)!=='0';
    if (!on) a.muted = true;
    return a;
  };
  refreshIcon();

  // Small utilities (e.g., mark year in footer)
  const yy = document.getElementById('yy'); if (yy) yy.textContent = new Date().getFullYear();
})();
