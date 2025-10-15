// /tools/make-thumbs.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const postersDir = 'media/posters/v1';
const thumbsDir  = 'media/thumbnails';
const ensure = (p) => fs.existsSync(p) || fs.mkdirSync(p, { recursive: true });

ensure(thumbsDir);

const posterFiles = fs.readdirSync(postersDir)
  .filter(f => /\.(png|jpg|jpeg)$/i.test(f));

const tasks = [];

// Poster thumbs: 480x270  (16:9) JPEG quality 68
for (const f of posterFiles) {
  const src = path.join(postersDir, f);
  const out = path.join(thumbsDir, f.replace(/\.(png|jpe?g)$/i, '-thumb.jpg'));
  tasks.push(
    sharp(src).resize(480, 270, { fit: 'cover' }).jpeg({ quality: 68 }).toFile(out)
  );
}

// Feature & logo thumbs
const featureSrc = 'media/branding/feature-graphic-1024x500.png';
if (fs.existsSync(featureSrc)) {
  tasks.push(sharp(featureSrc).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 70 }).toFile(path.join(thumbsDir, 'feature-thumb.jpg')));
}
const logoSrc = 'media/branding/logo-w-mark.png';
if (fs.existsSync(logoSrc)) {
  tasks.push(sharp(logoSrc).resize(512, 512, { fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } }).png().toFile(path.join(thumbsDir, 'logo-thumb.png')));
}

await Promise.all(tasks);
console.log(`✅ Thumbnails generated in ${thumbsDir}`);
