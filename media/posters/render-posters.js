#!/usr/bin/env node
/**
 * Whylee Poster Batch Render
 * - Requires: npm i sharp archiver
 * - Reads spec.json, processes src/*, applies watermark.svg, exports JPGs,
 *   and builds posters.zip
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import archiver from 'archiver';

const ROOT = path.resolve(process.cwd(), 'media', 'posters');
const SPEC = path.join(ROOT, 'spec.json');
const SRC_DIR = path.join(ROOT, 'src');

function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }

function outPath(file){ return path.join(ROOT, file); }

async function ensureDir(p){ await fs.promises.mkdir(p, { recursive:true }).catch(()=>{}); }

async function composePoster(inputFile, options, isLandscape, outFile){
  const {
    portraitWidth, portraitHeight,
    landscapeWidth, landscapeHeight,
    jpegQuality, watermark
  } = options;

  const w = isLandscape ? landscapeWidth  : portraitWidth;
  const h = isLandscape ? landscapeHeight : portraitHeight;

  const raw = sharp(inputFile).resize(w, h, { fit:'cover', withoutEnlargement:false });

  // Build layers
  const layers = [];
  if (watermark?.enabled) {
    const markBuffer = await fs.promises.readFile(path.join(ROOT, watermark.file));
    // Estimate scale vs poster width
    const markWidth = Math.round(w * (watermark.scale || 0.18));
    const markImg = await sharp(markBuffer)
      .resize({ width: markWidth })
      .toBuffer();

    // Position
    const m = watermark.margin ?? 40;
    let left = m, top = m;
    const markMeta = await sharp(markImg).metadata();

    switch (watermark.position) {
      case 'bottom-right':
        left = w - (markMeta.width || markWidth) - m;
        top  = h - (markMeta.height || Math.round(markWidth/3.75)) - m;
        break;
      case 'bottom-left':
        left = m; top = h - (markMeta.height || Math.round(markWidth/3.75)) - m;
        break;
      case 'top-right':
        left = w - (markMeta.width || markWidth) - m; top = m;
        break;
      default:
        // top-left
        left = m; top = m; break;
    }

    layers.push({
      input: markImg,
      top,
      left,
      blend: 'over',
      opacity: watermark.opacity ?? 0.18
    });
  }

  const out = await raw
    .composite(layers)
    .jpeg({ quality: jpegQuality ?? 88, chromaSubsampling:'4:4:4', mozjpeg:true })
    .toFile(outFile);

  return out;
}

async function zipOutputs(files){
  const zipFile = path.join(ROOT, 'posters.zip');
  const out = fs.createWriteStream(zipFile);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject)=>{
    out.on('close', ()=> resolve(zipFile));
    archive.on('error', reject);
    archive.pipe(out);
    files.forEach(f => archive.file(f, { name: path.basename(f) }));
    archive.finalize();
  });
}

async function run(){
  if (!exists(SPEC)) throw new Error('spec.json not found in media/posters');
  if (!exists(SRC_DIR)) throw new Error('src/ folder not found in media/posters');

  const spec = JSON.parse(await fs.promises.readFile(SPEC, 'utf8'));
  const outputs = [];

  for (const item of spec.items){
    // allow png or jpg input
    const srcFile = path.join(SRC_DIR, item.src);
    if (!exists(srcFile)) {
      // try alternate extension
      const altPng = path.join(SRC_DIR, item.src.replace(/\.(jpg|jpeg)$/i, '.png'));
      const altJpg = path.join(SRC_DIR, item.src.replace(/\.png$/i, '.jpg'));
      const use = exists(altPng) ? altPng : (exists(altJpg) ? altJpg : null);
      if (!use) { console.warn('Skipping (missing):', item.key, item.src); continue; }
      item.src = path.basename(use);
    }
    const outFile = outPath(item.out);
    await composePoster(path.join(SRC_DIR, item.src), spec, false, outFile);
    outputs.push(outFile);

    if (spec.alsoMakeLandscape){
      const landOut = outPath(item.out.replace(/\.jpg$/i, '-land.jpg'));
      await composePoster(path.join(SRC_DIR, item.src), spec, true, landOut);
      outputs.push(landOut);
    }
    console.log('✔', item.key, '→', path.basename(item.out));
  }

  if (outputs.length){
    const zipPath = await zipOutputs(outputs);
    console.log('ZIP ready:', zipPath);
  } else {
    console.warn('No outputs created. Check spec and src files.');
  }
}

run().catch(err => {
  console.error('Poster render failed:', err);
  process.exit(1);
});
