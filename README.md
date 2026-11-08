# Never Going Home Companion

Offline companion app for the *Never Going Home* RPG (Wet Ink Games, +One System).
One codebase: Vite + Preact + TypeScript. Windows via Tauri, Android via Capacitor.

Stage 1 (done): interactive soldier record.
Stage 2 (done): +One dice roller, 54-card deck, hands, Corruption draws, Initiative, Journey, growth with cards.
Next: the rules reference.

## Run in a browser
    npm install
    npm run dev          # http://localhost:5173
    npm run build        # -> dist/ (used by Tauri and Capacitor)
    npm run build:single # -> dist-single/index.html, one self-contained file

## Windows .exe (Tauri 2)
Needs: Rust (https://rustup.rs) and Microsoft C++ Build Tools / WebView2 (preinstalled on Windows 10/11).

    npm i -D @tauri-apps/cli@2
    npx tauri init       # app name: NGH Companion; web assets: ../dist; dev url: http://localhost:5173
                         # dev command: npm run dev; build command: npm run build
    npx tauri build      # installer + exe in src-tauri/target/release/

The portable exe is `src-tauri/target/release/ngh-companion.exe`.

## Android .apk in the cloud (no Android Studio)
Push this folder to a GitHub repository. Every push to `main` builds the APK and publishes it under Releases as `NGH-Companion.apk` (latest release). You can also run it by hand: Actions → "Android APK" → Run workflow.

## Android .apk locally (Capacitor 6)
Needs: Android Studio (with SDK) and JDK 17.

    # Capacitor is already in package.json and capacitor.config.json
    npm run build
    npx cap add android
    npx cap sync android
    cd android && ./gradlew assembleDebug   # Windows: gradlew.bat assembleDebug

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. After code changes: `npm run build && npx cap sync android`.

## Code map
- `src/rules.ts` — attributes, skills, Whisper Paths and rituals, weapons, growth costs (with book page refs)
- `src/store.ts` — character model, autosave (localStorage), change log, undo, end-of-Mission
- `src/i18n.ts` — Russian / English strings
- `src/components/Sheet.tsx` — the soldier record
- `src/App.tsx` — roster, tabs, settings, import/export
- `src/cards.ts`, `src/deckOps.ts` — deck model and every card move (draw, play, jokers, Corruption)
- `src/dice.ts`, `src/components/Dice.tsx` — d6 rolls and +One manipulations
- `src/components/Cards.tsx` — hand, deck, Initiative, Journey
