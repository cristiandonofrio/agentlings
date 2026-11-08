#!/bin/bash
# Renders docs/demo.gif and docs/screenshot.png from the gallery page's made-up hubs,
# one frame at a time in headless Chrome, so no real session names can get in.
# Needs the dev server running (npm run dev), Google Chrome and ffmpeg.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL="${URL:-http://localhost:5173/gallery.html}"
FRAMES="${FRAMES:-48}"
SIZE="${SIZE:-1440,870}"
OUT=docs
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

shot() { # frame, file, scale
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TMP/profile" \
    --window-size="$SIZE" --force-device-scale-factor="$3" --virtual-time-budget=2000 \
    --screenshot="$2" "$URL?frame=$1" >/dev/null 2>&1
}

mkdir -p "$OUT"
for i in $(seq 0 $((FRAMES - 1))); do
  shot "$i" "$TMP/$(printf 'f%03d' "$i").png" 1
done
shot 0 "$OUT/screenshot.png" 2

ffmpeg -v error -y -framerate 8 -i "$TMP/f%03d.png" -vf "palettegen=max_colors=128:stats_mode=full" "$TMP/palette.png"
ffmpeg -v error -y -framerate 8 -i "$TMP/f%03d.png" -i "$TMP/palette.png" \
  -lavfi "paletteuse=dither=none" -loop 0 "$OUT/demo.gif"
ls -lh "$OUT/demo.gif" "$OUT/screenshot.png"
