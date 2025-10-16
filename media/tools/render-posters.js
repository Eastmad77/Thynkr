/**
 * render-posters.js — Whylee Poster Automation Tool
 * -----------------------------------------------
 * Generates motion or static composites from the poster set.
 * Requires Node 18+ and sharp.
 *
 * Usage:
 *   node render-posters.js
 */

import fs from "fs";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postersDir = path.resolve(__dirname, "../v1");
const outputDir = path.resolve(__dirname, "../../motion");
const specPath = path.resolve(__dirname, "spec.json");
const watermarkPath = path.resolve(__dirname, "watermark.svg");
const bannerPath = path.resolve(__dirname, "whylee-banner-3840x2160.svg");

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// Load spec.json (defines sequence and text)
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

(async () => {
  console.log("🎬 Rendering Whylee cinematic posters...");

  for (const item of spec.sequence) {
    const inputFile = path.join(postersDir, item.file);
    const outputFile = path.join(outputDir, item.output);

    console.log(`→ Processing ${item.file} → ${item.output}`);

    const composite = await sharp(inputFile)
      .composite([
        { input: watermarkPath, gravity: "southeast", blend: "over", opacity: 0.3 },
      ])
      .resize({ width: 1920, height: 1080, fit: "cover" })
      .jpeg({ quality: 92 })
      .toBuffer();

    await sharp(composite)
      .extend({ top: 60, background: "#000000" })
      .composite([
        {
          input: Buffer.from(
            `<svg width="1920" height="60">
              <text x="60" y="40" font-size="28" font-family="Inter" fill="#ffffff99">
                ${item.caption}
              </text>
            </svg>`
          ),
          top: 0,
          left: 0,
        },
      ])
      .toFile(outputFile);
  }

  // Add banner if defined
  if (fs.existsSync(bannerPath)) {
    await sharp(bannerPath)
      .resize(1920, 1080)
      .jpeg({ quality: 95 })
      .toFile(path.join(outputDir, "poster-outro.jpg"));
    console.log("🏁 Outro banner added: poster-outro.jpg");
  }

  console.log("✅ All posters rendered successfully!");
})();

