# Attune — One tone. Surf the song of the world until you find the frequency where you belong.

A glassmorphism, one-thumb **wave-surfing music game** for iOS (Android fast-follow).
A glowing sine wave (you) scrolls forward; drag your thumb up/down to tune its
frequency and thread a glowing, wavy corridor. **The music is the obstacle** —
stay aligned and a procedural adaptive soundtrack blooms; drift and it strains;
crash and it tape-stops. 300 songs across 25 packs, an endless **Drift** mode, an
animated story, a How-to-Play onboarding, Game Center leaderboards, and a premium
one-time unlock — fully offline, zero login.

Built natively per **PANDUAN_IMPLEMENTASI.md** (React Native + Expo + Skia,
single-component state machine, offline `AsyncStorage`, RevenueCat IAP, a local
Game Center native module), recreating the design exported from Claude Design
(`Attune Prototype.html`). The UI is rebuilt in native RN/Skia — it is **not** a
webview.

## Run it

These are native modules (Skia, blur, audio synth, purchases, Game Center), so
**Expo Go is not enough** — you need a development build.

```bash
npm install                       # .npmrc forces legacy-peer-deps
npx expo run:ios                  # compile dev client (needs Xcode), start Metro
npx expo export --platform ios    # bundle-only sanity check (no device)
```

There is no test suite / linter; verification is `expo export` + run in the
simulator. Play with **headphones** — the adaptive audio is the point.

## Architecture (where things live)

```
src/
├── App.js              # shell: state machine, load-once persistence, stack nav, fonts, first-run flow
├── config.js           # RevenueCat keys, entitlement, Game Center leaderboard IDs
├── theme.js            # SOURCE OF TRUTH: dark glass palette + 6 per-song palettes + fonts
├── storage.js          # AsyncStorage wrapper (LS) + today()
├── audio.js            # adaptive Web-Audio synth on react-native-audio-api (degrades to no-op)
├── iap.js              # RevenueCat hub (degrades to no-op without keys)
├── leaderboard.js      # Game Center wrapper (degrades to no-op)
├── giftcodes.js        # hash-based gift-code unlock (regenerate via scripts/gen-gift-codes.js)
├── songs.js            # 6 curated songs, corridor mapping constants, endless generator
├── library.js          # 25 packs × 12 = 300 songs + deterministic procedural segments
├── game/
│   └── WaveEngine.js    # the engine — Skia renderer + rAF physics loop + drag-to-tune
├── components/
│   ├── ui.js            # Glass primitives: Backdrop, Panel, Chip, Button, Switch, Slider, AlignMeter, Avatar
│   └── skiaWaves.js     # breathing hero wave + looping how-to mini-demos + mini glyphs
└── screens/
    ├── TitleScreen, SongMapScreen, PackScreen, LeaderboardScreen, SettingsScreen,
    ├── ResultsScreen, StoryScreen, HowToScreen, PaywallScreen, GameScreen
    └── parts.js         # rank math, Game Center banner, song row, pack card
modules/expo-game-center/   # local Swift/GameKit native module (no login UI)
scripts/gen-gift-codes.js   # (re)generate giftcodes.js (hashes) + GIFT_CODES.txt (plaintext)
```

Mental model: **two worlds** (the Skia game stage ↔ the RN menu screens) chosen by
the top route. **One component** (`Game`) holds all state and persists `progress`
+ `tweaks` per key. The **engine** keeps the whole world in a ref, runs one rAF
loop, reads props via ref-mirrors, and repaints declarative Skia. **Theme** is the
only home for color. External services (audio / IAP / Game Center) degrade to
no-op so the JS bundle always runs.

### Core mechanic & hidden depth
- **Tune:** drag up/down → your wave's spatial frequency (`songs.js` maps a 0..1
  pitch to cycles/px). Amplitude is constant; release holds the last pitch.
- **Align:** thread the corridor's centre. Closeness drives `align` (0..1) →
  score, glow, particle bursts on phase-perfect, and the live audio mix.
- **Anticipate:** segments `ramp` their pitch/gap, so channels shift mid-run —
  lead them early.
- **Superpose:** late segments add a `comp` companion wave; you must tune so the
  **sum** threads the gap.
- **Endless (Drift):** a solvable procedural generator that tightens with distance.

## What's done vs. what needs your accounts

The code is complete and runs offline. Before shipping you must do the **manual
portal work** (only a human can) — see PANDUAN §§15–20.

- **Audio** — works on-device via `react-native-audio-api`. If that module isn't
  in a build, `audio.js` no-ops and the game stays fully playable (visuals are the
  source of truth for collision, per the PRD).
- **RevenueCat** — paste your `appl_…` key into `src/config.js`; create the
  `lifetime` non-consumable + entitlement `Attune Pro` + a default offering +
  paywall. Until then the paywall **simulates** the unlock so the flow is walkable.
- **Game Center** — create leaderboards matching `GAME_CENTER_LEADERBOARDS` in
  `src/config.js` (`attune.endless.distance`, `attune.total.score`); the native
  module needs a fresh dev/EAS build to compile. Off-iOS the Ranks screen shows a
  seeded preview.
- **App Store Connect** — app record, IAP attached to the version, App Privacy
  form (Purchases + Game Center; no ads/tracking), screenshots, age rating 4+.
- **Privacy/Support** — host docs and set the URLs.
- **Icon/splash** — add `assets/icon.png` (1024×1024, no alpha) and re-add the
  `icon` key in `app.json` before `eas build`.

Gift codes: run `node scripts/gen-gift-codes.js` to (re)generate
`src/giftcodes.js` (hashes, committed) + `GIFT_CODES.txt` (plaintext, gitignored).
Codes are redeemed in **Settings → Redeem gift code** and unlock the same as Pro.
