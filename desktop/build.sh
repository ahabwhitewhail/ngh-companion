#!/usr/bin/env bash
# Packs the web build (../dist) into a portable Windows app with Neutralinojs.
# Output: desktop/out/NGH-Companion-Windows.zip
set -euo pipefail
cd "$(dirname "$0")"
rm -rf resources out dist bin
mkdir -p resources out/NGH-Companion
cp -r ../dist/. resources/
cp icon.png resources/icon.png
npx --yes @neutralinojs/neu@11.0.1 update
npx --yes @neutralinojs/neu@11.0.1 build --release
cp dist/NGH-Companion/NGH-Companion-win_x64.exe out/NGH-Companion/NGH-Companion.exe
cp dist/NGH-Companion/resources.neu out/NGH-Companion/
cp README.txt out/NGH-Companion/
(cd out && zip -qr NGH-Companion-Windows.zip NGH-Companion)
echo "Built desktop/out/NGH-Companion-Windows.zip"
