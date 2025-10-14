#!/usr/bin/env bash
set -euo pipefail

# Whylee — Poster Pack Builder (PNG → 1:1, 16:9, 9:16 + WebP + ZIP)
# Requirements: ImageMagick (convert), cwebp (optional), zip

SRC_DIR="media/posters/src"           # put your master PNGs here (10 images)
OUT_DIR="media/posters/build"         # generated output
WEBP_DIR="$OUT_DIR/webp"
ONE_DIR="$OUT_DIR/1x1"
WIDE_DIR="$OUT_DIR/16x9"
VERT_DIR="$OUT_DIR/9x16"
WATERMARK="media/icons/whylee-fox.png"   # optional watermark PNG (semi-transparent)

mkdir -p "$ONE_DIR" "$WIDE_DIR" "$VERT_DIR" "$WEBP_DIR"

# Map input → canonical names
declare -a names=(
  "poster-1-welcome.png:poster-1-start.png"
  "poster-2-level1.png:poster-2-level1.png"
  "poster-3-level2.png:poster-3-level2.png"
  "poster-4-level3.png:poster-4-level3.png"
  "poster-5-reflection.png:poster-5-reflection.png"
  "poster-6-pro-invite.png:poster-6-pro.png"
  "poster-7-rewards.png:poster-7-rewards.png"
  "poster-8-progress.png:poster-8-progress.png"
  "poster-9-community.png:poster-9-community.png"
  "poster-10-closing.png:poster-10-closing.png"
)

echo "▶︎ Generating aspect ratios + watermark…"
for pair in "${names[@]}"; do
  IN="${pair%%:*}" ; OUT="${pair##*:}"
  SRC="$SRC_DIR/$IN"
  [ -f "$SRC" ] || { echo "Missing $SRC"; exit 1; }

  # 1:1 (2048 x 2048)
  convert "$SRC" -resize "2048x2048^" -gravity center -extent 2048x2048 \
    \( "$WATERMARK" -gravity southeast -geometry +56+56 \) -compose over -composite \
    "$ONE_DIR/$OUT"

  # 16:9 (3840 x 2160)
  convert "$SRC" -resize "3840x2160^" -gravity center -extent 3840x2160 \
    \( "$WATERMARK" -gravity southeast -geometry +80+80 \) -compose over -composite \
    "$WIDE_DIR/${OUT%.png}-16x9.png"

  # 9:16 (1080 x 1920)
  convert "$SRC" -resize "1080x1920^" -gravity center -extent 1080x1920 \
    \( "$WATERMARK" -gravity southeast -geometry +40+40 \) -compose over -composite \
    "$VERT_DIR/${OUT%.png}-9x16.png"
done

echo "▶︎ Converting to WebP (quality 88)…"
for f in "$ONE_DIR"/*.png "$WIDE_DIR"/*.png "$VERT_DIR"/*.png; do
  base="$(basename "$f" .png)"
  cwebp -q 88 "$f" -o "$WEBP_DIR/${base}.webp" >/dev/null 2>&1 || true
done

# metadata + readme
cat > "$OUT_DIR/metadata.json" <<JSON
{
  "version": "v3.4",
  "theme": "dark_premium_gold",
  "palette": { "bg":"#0a0e18","gold":"#d8a84e","blue":"#2f9fff" },
  "files": {
    "count": 10,
    "ratios": ["1x1","16x9","9x16"],
    "formats": ["png","webp"]
  }
}
JSON

cat > "$OUT_DIR/README.md" <<MD
# Whylee Poster Pack (Build)
- 10 posters × 3 ratios (1:1, 16:9, 9:16), PNG + WebP
- Semi-transparent watermark bottom-right
- Use 1:1 in app cards, 16:9 for site/trailer, 9:16 for social

Folders:
- 1x1/   → app cards / square feeds
- 16x9/  → banners / video
- 9x16/  → Stories / Reels / Shorts
- webp/  → optimized web versions
MD

echo "▶︎ Zipping…"
pushd "$OUT_DIR" >/dev/null
zip -rq whylee_poster_pack_full.zip 1x1 16x9 9x16 webp metadata.json README.md
popd >/dev/null

echo "✅ Done → $OUT_DIR/whylee_poster_pack_full.zip"
