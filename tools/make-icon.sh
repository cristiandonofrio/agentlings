#!/bin/bash
# Renders icon.html (the Workspace robot) and makes every app icon size from it.
# Needs the dev server running (npm run dev) and Google Chrome.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ICONS=src-tauri/icons
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

"$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TMP/profile" \
  --window-size=1024,1024 --force-device-scale-factor=1 --default-background-color=00000000 \
  --virtual-time-budget=2000 --screenshot="$ICONS/source.png" "${URL:-http://localhost:5173/icon.html}" >/dev/null 2>&1

size() { sips -z "$1" "$1" "$ICONS/source.png" --out "$2" >/dev/null; }
size 32 "$ICONS/32x32.png"
size 128 "$ICONS/128x128.png"
size 256 "$ICONS/128x128@2x.png"
size 512 "$ICONS/icon.png"

SET="$TMP/icon.iconset"
mkdir "$SET"
for s in 16 32 128 256 512; do
  size "$s" "$SET/icon_${s}x${s}.png"
  size $((s * 2)) "$SET/icon_${s}x${s}@2x.png"
done
iconutil -c icns "$SET" -o "$ICONS/icon.icns"
ls -l "$ICONS"
