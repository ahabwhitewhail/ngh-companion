#!/usr/bin/env bash
# Packs the web build (../dist) into a portable Windows app with Neutralinojs.
# Output: desktop/out/NGH-Companion-Windows.zip
set -euo pipefail
cd "$(dirname "$0")"
rm -rf resources out dist bin
mkdir -p resources out/NGH-Companion
cp -r ../dist/. resources/
cp icon.png resources/icon.png
# Neutralino runtime binaries, downloaded directly and checked before use.
NEU_VERSION=$(node -p "require('./neutralino.config.json').cli.binaryVersion")
NEU_TMP=$(mktemp -d)   # outside the project, so neu does not pack the zip
NEU_ZIP="$NEU_TMP/neutralinojs-v$NEU_VERSION.zip"
mkdir -p bin
for i in 1 2 3 4 5; do
  curl -fsSL --retry 3 -o "$NEU_ZIP" "https://github.com/neutralinojs/neutralinojs/releases/download/v$NEU_VERSION/neutralinojs-v$NEU_VERSION.zip" && unzip -tq "$NEU_ZIP" && break
  echo "Runtime download failed or corrupt (attempt $i), retrying…"; rm -f "$NEU_ZIP"; sleep $((i * 5))
  [ "$i" = 5 ] && exit 1
done
unzip -oq "$NEU_ZIP" -d bin
rm -rf "$NEU_TMP"
npx --yes @neutralinojs/neu@11.0.1 build --release
cp dist/NGH-Companion/NGH-Companion-win_x64.exe out/NGH-Companion/NGH-Companion.exe
cp dist/NGH-Companion/resources.neu out/NGH-Companion/
cp README.txt out/NGH-Companion/
(cd out && zip -qr NGH-Companion-Windows.zip NGH-Companion)
echo "Built desktop/out/NGH-Companion-Windows.zip"
