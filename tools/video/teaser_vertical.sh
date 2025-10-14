#!/usr/bin/env bash
set -euo pipefail

# Whylee — 9:16 Social Teaser (≈12–15s)
# Requires: ffmpeg

BGM="media/audio/bgm-track.mp3"
OUT="whylee_teaser_vertical.mp4"
P="media/posters/build/9x16"

test -f "$P/poster-1-start-9x16.png" || { echo "Run make_poster_pack first."; exit 1; }

D1=3.0; D2=2.6; D4=2.6; D7=2.6; D10=3.0; XF=0.7

ffmpeg -y \
  -loop 1 -t $D1  -i "$P/poster-1-start-9x16.png" \
  -loop 1 -t $D2  -i "$P/poster-2-level1-9x16.png" \
  -loop 1 -t $D4  -i "$P/poster-4-level3-9x16.png" \
  -loop 1 -t $D7  -i "$P/poster-7-rewards-9x16.png" \
  -loop 1 -t $D10 -i "$P/poster-10-closing-9x16.png" \
  -i "$BGM" -filter_complex "
  [0:v]zoompan=z='min(zoom+0.0009,1.08)':d=128:s=1080x1920,format=yuv420p[v0];
  [1:v]zoompan=z='min(zoom+0.0009,1.08)':d=110:s=1080x1920,format=yuv420p[v1];
  [2:v]zoompan=z='min(zoom+0.0009,1.08)':d=110:s=1080x1920,format=yuv420p[v2];
  [3:v]zoompan=z='min(zoom+0.0009,1.08)':d=110:s=1080x1920,format=yuv420p[v3];
  [4:v]zoompan=z='min(zoom+0.0009,1.08)':d=128:s=1080x1920,format=yuv420p[v4];

  [v0][v1]xfade=transition=fade:duration=${XF}:offset=$(echo "$D1 - $XF" | bc)[x1];
  [x1][v2]xfade=transition=fade:duration=${XF}:offset=$(echo "$D1 + $D2 - 2*$XF" | bc)[x2];
  [x2][v3]xfade=transition=fade:duration=${XF}:offset=$(echo "$D1 + $D2 + $D4 - 3*$XF" | bc)[x3];
  [x3][v4]xfade=transition=fade:duration=${XF}:offset=$(echo "$D1 + $D2 + $D4 + $D7 - 4*$XF" | bc)[vout];
  " -map "[vout]" -map 5:a? -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p \
  -movflags +faststart -shortest "$OUT"

echo "✅ Teaser ready → $OUT"
