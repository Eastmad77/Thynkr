WHYLEE POSTER TOOLKIT — CINEMATIC RENDER

This folder contains the poster rendering toolkit used for Whylee’s cinematic promotional builds.

CONTENTS:
- render-posters.js     — Node automation to composite, caption, and watermark posters
- spec.json             — Defines order, output, and captions for each frame
- watermark.svg         — Applied semi-transparent overlay in bottom corner
- whylee-banner-3840x2160.svg — Title/outro card for final render
- readme.txt            — Reference instructions

USAGE:
1. Install dependencies:
   npm install sharp

2. From /media/posters/tools/ run:
   node render-posters.js

3. Outputs go to:
   /media/motion/

The script composites all posters defined in spec.json, adds watermark + caption,
and generates an optional outro banner (poster-outro.jpg).

Version: v1.0 — October 2025
