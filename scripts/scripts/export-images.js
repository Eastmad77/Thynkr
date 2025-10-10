#!/usr/bin/env node
/**
 * export-images.js — scaffold poster triplets (jpg/mp4/webm)
 * Usage: node media/scripts/export-images.js
 */
import fs from 'node:fs';
import path from 'node:path';

const posters = [
  'poster-start',
  'poster-countdown',
  'poster-level2',
  'poster-level3',
  'poster-success',
  'poster-night',
  'poster-gameover'
];

const dir = path.resolve('media/posters');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let created = 0;
posters.forEach(name => {
  ['.jpg','.mp4','.webm'].forEach(ext => {
    const p = path.join(dir, name + ext);
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, '');
      created++;
    }
  });
});

console.log(`Scaffolded ${created} files in media/posters`);
console.log('Now replace the zero-byte files with real assets from your design exports.');
