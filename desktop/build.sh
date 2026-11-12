#!/usr/bin/env bash
# Packs the web build (../dist) into a portable Windows app with Neutralinojs.
# Output: desktop/out/NGH-Companion-Windows.zip
set -euo pipefail
cd "$(dirname "$0")"
rm -rf resources out dist bin
mkdir -p resources out/NGH-Companion
cp -r ../dist/. resources/
cp icon.png resources/icon.png
# The runtime download from GitHub occasionally arrives truncated; retry a few times.
for i in 1 2 3; do
  if npx --yes @neutralinojs/neu@11.0.1 update; then break; fi
  echo "neu update failed (attempt $i), retrying…"; rm -rf bin; sleep 5
  [ "$i" = 3 ] && exit 1
done
npx --yes @neutralinojs/neu@11.0.1 build --release
cp dist/NGH-Companion/NGH-Companion-win_x64.exe out/NGH-Companion/NGH-Companion.exe
cp dist/NGH-Companion/resources.neu out/NGH-Companion/
cp README.txt out/NGH-Companion/
(cd out && zip -qr NGH-Companion-Windows.zip NGH-Companion)
echo "Built desktop/out/NGH-Companion-Windows.zip"
