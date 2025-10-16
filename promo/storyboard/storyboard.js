// Helper
const pad2 = n => String(n).padStart(2, '0');

// Bases
const baseThumb = '/media/thumbnails';
const baseVideo = '/media/motion';

// Scene list (match your posters/thumbnail naming)
const SCENES = [
  { id: 'poster-01-start',      name: 'Start' },
  { id: 'poster-02-mode',       name: 'Mode Select' },
  { id: 'poster-03-reward',     name: 'Reward' },
  { id: 'poster-04-reflection', name: 'Reflection' },
  { id: 'poster-05-upgrade',    name: 'Upgrade' }, // Free only (swapped in Pro)
  { id: 'poster-06-challenge',  name: 'Challenge' },
  { id: 'poster-07-pro',        name: 'Pro (Teaser)' },
  { id: 'poster-08-levelup',    name: 'Level Up' },
  { id: 'poster-09-community',  name: 'Community' },
  { id: 'poster-10-brand',      name: 'Brand' }
];

// Build columns
const freeCol = document.createElement('div');
freeCol.className = 'sb-col';
freeCol.innerHTML = `<h2>Free — Cinematic Flow</h2><div class="sb-stack" id="stackFree"></div>`;

const proCol = document.createElement('div');
proCol.className = 'sb-col';
proCol.innerHTML = `<h2>Pro — Cinematic Flow</h2><div class="sb-stack" id="stackPro"></div>`;

document.getElementById('storyboardGrid').appendChild(freeCol);
document.getElementById('storyboardGrid').appendChild(proCol);

// For Pro, swap scene 05 to Rewards (poster-07-pro)
const scenesFree = SCENES.slice();
const scenesPro  = SCENES.slice();
scenesPro[4] = { id: 'poster-07-pro', name: 'Rewards' };

// Feature detect WebM support
const videoEl = document.createElement('video');
const SUPPORTS_WEBM = !!videoEl.canPlayType && !!videoEl.canPlayType('video/webm; codecs="vp9,opus"');
const SUPPORTS_MP4  = !!videoEl.canPlayType && !!videoEl.canPlayType('video/mp4');

// HEADS-UP: we’ll create <video><source webm/><source mp4/></video> and let the browser pick.
// We also test URLs with HEAD to avoid 404s on hover.

async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

function makeSources(id) {
  // Prefer WebM, then MP4. Browser will pick the first playable source that exists.
  return [
    { src: `${baseVideo}/${id}.webm`, type: 'video/webm', prefer: true  },
    { src: `${baseVideo}/${id}.mp4`,  type: 'video/mp4',  prefer: false }
  ];
}

function makeCard({ scene, index, isPro }) {
  const card = document.createElement('article');
  card.className = `sb-card reveal${isPro ? ' pro' : ''}`;
  card.style.setProperty('--stagger', `${Math.min(70 + index * 60, 160)}ms`);

  const frame = document.createElement('div'); frame.className = 'sb-frame';

  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = `${isPro ? 'Pro' : 'Free'} storyboard scene ${pad2(index + 1)} — ${scene.name}`;
  img.src = `${baseThumb}/${scene.id}-thumb.jpg`;
  frame.appendChild(img);

  const vid = document.createElement('video');
  vid.muted = true; vid.loop = true; vid.playsInline = true; vid.preload = 'metadata';
  // Add both sources (webm preferred first)
  const sources = makeSources(scene.id);
  sources.forEach(s => {
    const srcEl = document.createElement('source');
    srcEl.src = s.src;
    srcEl.type = s.type;
    vid.appendChild(srcEl);
  });
  frame.appendChild(vid);

  const meta = document.createElement('div'); meta.className = 'sb-meta';
  const label = document.createElement('div'); label.className = 'sb-label';
  const num   = document.createElement('span'); num.className = 'sb-num';  num.textContent = pad2(index + 1);
  const name  = document.createElement('span'); name.className = 'sb-name'; name.textContent = scene.name;
  label.appendChild(num); label.appendChild(name);

  const hint = document.createElement('span'); hint.className = 'sb-hint';
  hint.textContent = 'Hover to preview · Click to expand';
  meta.appendChild(label); meta.appendChild(hint);

  card.appendChild(frame); card.appendChild(meta);

  // Attach hover preview only if at least one source file exists
  let hasPlayable = false;
  let armed = false;

  // We’ll probe sources (HEAD) once, then wire events
  (async () => {
    // If browser can’t play either format, skip (keeps thumbnail only)
    if (!SUPPORTS_WEBM && !SUPPORTS_MP4) return;

    for (const s of sources) {
      if (await urlExists(s.src)) {
        hasPlayable = true;
        break;
      }
    }

    if (!hasPlayable) return;

    // Hover/focus preview
    const playPreview = () => { if (!armed) { vid.currentTime = 0; vid.play().catch(()=>{}); armed = true; } vid.style.opacity = 1; };
    const stopPreview = () => { vid.pause(); vid.style.opacity = 0; };

    card.addEventListener('mouseenter', playPreview);
    card.addEventListener('focusin', playPreview);
    card.addEventListener('mouseleave', stopPreview);
    card.addEventListener('focusout', stopPreview);

    // Click → modal
    card.addEventListener('click', () => openModalFor(scene.id, sources));
  })();

  return card;
}

function buildColumn(stackEl, scenes, isPro) {
  scenes.forEach((scene, i) => {
    const card = makeCard({ scene, index: i, isPro });
    stackEl.appendChild(card);
  });
}

buildColumn(document.getElementById('stackFree'), scenesFree, false);
buildColumn(document.getElementById('stackPro'),  scenesPro,  true);

// Reveal-on-scroll
const io = new IntersectionObserver((entries, obs) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('show');
      obs.unobserve(e.target);
    }
  }
}, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ---------------- Modal with dual-source ---------------- */
const modal = document.getElementById('modal');
const modalVideo = document.getElementById('modalVideo');
const closeBtn = document.getElementById('closeModal');

async function openModalFor(id, sources) {
  // Clear old <source> tags
  modalVideo.pause();
  modalVideo.innerHTML = '';
  modalVideo.removeAttribute('src');

  // Add only sources that actually exist (HEAD check)
  for (const s of sources) {
    if (await urlExists(s.src)) {
      const el = document.createElement('source');
      el.src = s.src; el.type = s.type;
      modalVideo.appendChild(el);
    }
  }

  // If no valid sources, do nothing
  if (!modalVideo.querySelector('source')) return;

  modal.classList.add('open');
  // Reload + play
  modalVideo.load();
  modalVideo.play().catch(()=>{});
}

function closeModal(){
  modal.classList.remove('open');
  modalVideo.pause();
  modalVideo.innerHTML = '';
  modalVideo.removeAttribute('src');
}
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

