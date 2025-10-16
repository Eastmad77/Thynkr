// tools/make-motion-from-posters.mjs
import { exec as _exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const exec = promisify(_exec);

const SRC_DIR  = 'media/posters/v1';
const OUT_DIR  = 'media/motion';
const DURATION = 6;      // seconds per clip
const FPS      = 30;     // 30 fps
const WIDTH    = 1280;   // output width (height auto)
const CRF      = 22;     // h264 quality (lower = better)
const PRESET   = 'slow'; // h264 speed

// Optional: Per-scene motion presets (pan directions / zoom amount)
const PRESETS_PATH = 'tools/kenburns-presets.json';
let PRESETS = {};
if (fs.existsSync(PRESETS_PATH)) {
  try { PRESETS = JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf-8')); } catch {}
}

// Ensure out dir
fs.mkdirSync(OUT_DIR, { recursive: true });

// Collect posters
const posters = fs.readdirSync(SRC_DIR)
  .filter(f => /\.(jpe?g|png)$/i.test(f))
  .sort();

if (!posters.length) {
  console.error(`[Whylee] No posters found in ${SRC_DIR}`);
  process.exit(1);
}

/**
 * Build Ken Burns filter string.
 * We scale the still to fit WIDTH x auto, then apply zoompan.
 * Motion defaults are tuned for subtle cinematic feel.
 */
function buildZoomPan(id) {
  // Defaults
  const p = PRESETS[id] || {};
  const zoomStart = p.zoomStart ?? 1.05;   // start slightly zoomed in
  const zoomEnd   = p.zoomEnd   ?? 1.12;   // end a bit more zoom
  const xStart    = p.xStart    ?? 0.5;    // normalized center 0..1
  const yStart    = p.yStart    ?? 0.5;
  const xEnd      = p.xEnd      ?? 0.48;
  const yEnd      = p.yEnd      ?? 0.52;

  // Create expressions that move from start → end over frames
  // n = frame number, total frames = DURATION * FPS
  const N = DURATION * FPS;
  const zoomExpr = `${zoomStart}+(${zoomEnd - zoomStart})*n/${N}`;
  const xExpr    = `${xStart}+(${xEnd - xStart})*n/${N}`;
  const yExpr    = `${yStart}+(${yEnd - yStart})*n/${N}`;

  // zoompan uses x,y in pixels, so we must derive from scaled size.
  // Strategy: first scale to WIDTH:x, then use iw, ih in expressions.
  // We'll compute pixel coords based on center (xExpr,yExpr).
  // Translate center (0..1) → pixel positions: Xpix = (iw - iw/zoom)*xExpr, Ypix = (ih - ih/zoom)*yExpr
  const xPix = `(iw - iw/${zoomExpr})*${xExpr}`;
  const yPix = `(ih - ih/${zoomExpr})*${yExpr}`;

  // Final vf:
  // - scale to WIDTH keeping aspect
  // - zoompan with scrolling center + zoom
  // - fps to ensure smooth frames
  // - format to yuv420p for browser compatibility
  return `scale=${WIDTH}:-2,zoompan=z='${zoomExpr}':x='${xPix}':y='${yPix}':d=${N}:s=${WIDTH}x-2,` +
         `fps=${FPS},format=yuv420p`;
}

async function makeMp4(inputPath, outPath, id) {
  const vf = buildZoomPan(id);
  const cmd = [
    'ffmpeg -y',
    `-loop 1 -t ${DURATION}`,
    `-i "${inputPath}"`,
    `-vf "${vf}"`,
    `-c:v libx264 -preset ${PRESET} -profile:v high -level 4.1 -crf ${CRF}`,
    `-pix_fmt yuv420p`,
    `-movflags +faststart`,
    `"${outPath}"`
  ].join(' ');
  console.log('▶️  MP4:', path.basename(outPath));
  await exec(cmd);
}

async function makeWebm(inputPath, outPath, id) {
  const vf = buildZoomPan(id);
  const cmd = [
    'ffmpeg -y',
    `-loop 1 -t ${DURATION}`,
    `-i "${inputPath}"`,
    `-vf "${vf}"`,
    `-c:v libvpx-vp9 -b:v 0 -crf 32 -row-mt 1 -deadline good -pix_fmt yuv420p`,
    `"${outPath}"`
  ].join(' ');
  console.log('▶️  WEBM:', path.basename(outPath));
  await exec(cmd);
}

(async () => {
  for (const file of posters) {
    const base = file.replace(/\.(jpe?g|png)$/i, '');
    // normalise id to match your storyboard ids (poster-XX-name)
    const id = base; // already matches your naming convention
    const inPath  = path.join(SRC_DIR, file);
    const outMp4  = path.join(OUT_DIR, `${base}.mp4`);
    const outWebm = path.join(OUT_DIR, `${base}.webm`);

    try {
      await makeMp4(inPath, outMp4, id);
      await makeWebm(inPath, outWebm, id);
    } catch (err) {
      console.error('✖ Error rendering', base, err?.stderr || err?.message || err);
    }
  }
  console.log(`✅ Motion clips generated → ${OUT_DIR}`);
})();
