# Panduan Implementasi — Membangun Aplikasi Bergaya "Pivot"

Panduan ini menjelaskan **cara membangun aplikasi/game baru dengan struktur yang sama
persis seperti Pivot**: React Native (Expo) + Skia, glassmorphism, fully offline,
state machine satu komponen, monetisasi RevenueCat, dan leaderboard Game Center.

Gunakan dokumen ini sebagai cetak biru. Setiap bagian menjelaskan **apa**, **mengapa**,
dan **pola kode** yang bisa kamu salin lalu adaptasi untuk game-mu sendiri (ganti
"orb yang terbang" dengan mekanik apa pun — semua kerangka di sekitarnya tetap sama).

> Catatan: ganti nama "Pivot", bundle id `com.pivot.game`, dan semua kunci/ID
> dengan milikmu sendiri. Bagian-bagian yang menyebut kunci API live di sini adalah
> contoh — jangan pakai kunci orang lain.

---

## Daftar Isi

1. [Filosofi Arsitektur](#1-filosofi-arsitektur)
2. [Tech Stack & Versi](#2-tech-stack--versi)
3. [Bootstrap Proyek](#3-bootstrap-proyek)
4. [File Konfigurasi](#4-file-konfigurasi)
5. [Struktur Folder](#5-struktur-folder)
6. [Lapisan 1 — Theme (Sumber Kebenaran Visual)](#6-lapisan-1--theme-sumber-kebenaran-visual)
7. [Lapisan 2 — Persistence (Offline Storage)](#7-lapisan-2--persistence-offline-storage)
8. [Lapisan 3 — App Shell & State Machine](#8-lapisan-3--app-shell--state-machine)
9. [Lapisan 4 — Game Engine (Skia + RAF)](#9-lapisan-4--game-engine-skia--raf)
10. [Lapisan 5 — Bahasa UI Glassmorphism](#10-lapisan-5--bahasa-ui-glassmorphism)
11. [Lapisan 6 — Layar & Navigasi](#11-lapisan-6--layar--navigasi)
12. [Lapisan 7 — Monetisasi (RevenueCat IAP)](#12-lapisan-7--monetisasi-revenuecat-iap)
13. [Lapisan 8 — Leaderboard (Native Game Center Module)](#13-lapisan-8--leaderboard-native-game-center-module)
14. [Lapisan 9 — Gift Codes (Unlock Lokal)](#14-lapisan-9--gift-codes-unlock-lokal)
15. [Setup Akun: developer.apple.com & Certificate](#15-setup-akun-developerapplecom--certificate)
16. [Setup RevenueCat (Dashboard + Paywall)](#16-setup-revenuecat-dashboard--paywall)
17. [Setup App Store Connect (IAP, Leaderboard, Privacy)](#17-setup-app-store-connect-iap-leaderboard-privacy)
18. [App Store Listing (Copy Siap Pakai)](#18-app-store-listing-copy-siap-pakai)
19. [Privacy Policy & Support Page](#19-privacy-policy--support-page)
20. [Deploy & Submit (EAS) + Jebakan](#20-deploy--submit-eas--jebakan)
21. [Checklist Implementasi](#21-checklist-implementasi)
22. [Apakah "Tinggal Deploy & Submit"?](#22-apakah-tinggal-deploy--submit)

---

## 1. Filosofi Arsitektur

Empat prinsip yang membentuk *seluruh* aplikasi. Pahami ini dulu sebelum menulis kode.

### a. Two-world split (pembelahan dua dunia)
Aplikasi punya **dua dunia yang berbeda secara teknologi**:
- **Dunia menu** — semua di luar permainan: home, leaderboard, toko skin, settings,
  overlay. Ini murni React Native `<View>` biasa dengan gaya glassmorphism.
- **Dunia game** — kanvas permainan langsung, dirender dengan **React Native Skia**
  (GPU, 60fps). Ini satu komponen besar (`GameStage`).

`App.js` memutuskan dunia mana yang dipasang lewat satu variabel `mode`
(`'menu'` | `'playing'`). Tidak ada navigator library — cukup conditional render.

### b. State machine di satu komponen
Tidak ada Redux/Zustand/Context yang rumit. **Satu komponen** (`Game()`) memegang
*semua* state aplikasi via `useState`, plus dua sumbu navigasi:
- `mode`: `menu` | `playing`
- `tab`: `play` | `ranks` | `skins` | `settings` (mana yang aktif di menu)

### c. Refs untuk state per-frame, bukan useState
Aturan emas engine game: **state yang berubah tiap frame hidup di `useRef`, bukan
`useState`**. Kalau pakai `useState`, kamu memicu badai re-render 60×/detik. Engine
menyimpan seluruh dunia di satu ref (`g.current`) dan hanya memanggil `setFrame()`
sekali per frame untuk memicu *repaint* (bukan recompute).

### d. Offline-first, zero login
Semua state disimpan lokal (AsyncStorage). Tidak ada akun, tidak ada backend, tidak
ada login UI. Leaderboard memakai Game Center (auto-auth dengan Apple ID device),
pembelian memakai RevenueCat (terikat ke Apple ID). Pengguna bisa langsung main.

---

## 2. Tech Stack & Versi

Versi-versi ini saling terkait erat (React 19 + Skia 2 + Reanimated 4). Salin
`package.json` ini supaya peer-deps cocok:

```json
{
  "dependencies": {
    "@expo-google-fonts/jetbrains-mono": "^0.4.1",
    "@expo-google-fonts/plus-jakarta-sans": "^0.4.1",
    "@expo-google-fonts/space-grotesk": "^0.4.1",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@shopify/react-native-skia": "2.6.2",
    "expo": "^56.0.8",
    "expo-asset": "~56.0.15",
    "expo-blur": "~56.0.3",
    "expo-font": "~56.0.5",
    "expo-haptics": "~56.0.3",
    "expo-linear-gradient": "~56.0.4",
    "expo-splash-screen": "~56.0.10",
    "expo-status-bar": "~56.0.4",
    "react": "19.2.3",
    "react-native": "0.85.3",
    "react-native-purchases": "^10.2.0",
    "react-native-purchases-ui": "^10.2.0",
    "react-native-reanimated": "4.3.1",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-svg": "15.15.4",
    "react-native-worklets": "0.8.3"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "babel-preset-expo": "^56.0.14"
  }
}
```

**Peran tiap paket:**
- `@shopify/react-native-skia` — kanvas game GPU (orb, pillar, partikel, langit).
- `expo-blur` — frosted glass asli (jantung glassmorphism).
- `react-native-reanimated` + `react-native-worklets` — animasi menu + dependensi Skia.
- `react-native-svg` — ikon.
- `react-native-purchases` + `-ui` — RevenueCat (IAP + paywall ter-hosting).
- `@react-native-async-storage/async-storage` — persistence offline.
- `expo-haptics` — getaran saat game over.
- `@expo-google-fonts/*` — tiga keluarga font (display, sans, mono).

> **Penting:** Skia, Reanimated, blur, dan purchases adalah **native module**.
> Artinya **Expo Go tidak cukup** — kamu butuh **development build** (`expo run:ios`).

---

## 3. Bootstrap Proyek

```bash
npx create-expo-app@latest mygame --template blank
cd mygame
# pasang dependensi persis seperti package.json di atas
npm install
```

`index.js` (entry point):

```js
import { registerRootComponent } from 'expo';
import App from './src/App';
registerRootComponent(App);
```

Perintah harian:

```bash
npm install                       # .npmrc memaksa legacy-peer-deps
npx expo run:ios                  # compile dev client (butuh Xcode), start Metro
npx expo run:android              # butuh Android Studio / SDK
npx expo export --platform ios    # bundle tanpa device — cek cepat error JS/import/babel
npx expo-doctor@latest            # cek kesehatan config & dependency
```

**Tidak ada test suite / linter / typecheck.** Verifikasi dilakukan dengan
`expo export` (bundling lolos) lalu jalankan di simulator. Di Metro, tekan `r` untuk reload.

---

## 4. File Konfigurasi

### `.npmrc` — WAJIB dan harus di-commit
```
legacy-peer-deps=true
```
Tanpa ini, install gagal pada rentang peer React 19 / Skia 2 / Reanimated 4 (juga
membuat fase "Install dependencies" di EAS gagal). Jaga `package-lock.json` tetap sinkron.

### `babel.config.js`
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 memindah transform Babel-nya ke react-native-worklets.
    // Plugin worklets HARUS terakhir. Skia menarik reanimated lewat moduleWrapper.
    plugins: ['react-native-worklets/plugin'],
  };
};
```

### `app.json`
```json
{
  "expo": {
    "name": "Pivot",
    "slug": "pivot",
    "version": "1.0.0",
    "icon": "./assets/icon.png",
    "orientation": "portrait",
    "userInterfaceStyle": "dark",
    "backgroundColor": "#0a0a0f",
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.pivot.game",
      "infoPlist": { "ITSAppUsesNonExemptEncryption": false },
      "entitlements": { "com.apple.developer.game-center": true }
    },
    "android": { "package": "com.pivot.game" },
    "plugins": [
      "expo-asset", "expo-font", "expo-status-bar",
      ["expo-splash-screen", { "backgroundColor": "#0a0a0f", "resizeMode": "contain" }]
    ],
    "extra": { "eas": { "projectId": "<your-eas-project-id>" } }
  }
}
```
Kunci penting: `entitlements.com.apple.developer.game-center: true` (wajib untuk
leaderboard) dan `ITSAppUsesNonExemptEncryption: false` (mempercepat review App Store).

### `eas.json`
```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "ios": { "simulator": true } },
    "production": {
      "autoIncrement": true,
      "ios": { "image": "latest", "resourceClass": "m-medium" }
    }
  },
  "submit": {
    "production": { "ios": { "appleId": "you@email.com", "appleTeamId": "XXXXXXXXXX" } }
  }
}
```
`production.ios.image: "latest"` memberi Xcode terbaru (Apple wajib Xcode 26+ sejak
2026-04-28; butuh SDK 54+).

---

## 5. Struktur Folder

```
src/
├── App.js                  # shell + state machine + persistence + navigasi
├── config.js               # kunci RevenueCat, entitlement, ID leaderboard
├── theme.js                # SUMBER KEBENARAN visual+game (palet, band, skin, font)
├── storage.js              # wrapper AsyncStorage (LS.get/set/multiGet) + today()
├── iap.js                  # hub RevenueCat (init, paywall, restore, harga)
├── leaderboard.js          # wrapper aman atas native Game Center module
├── giftcodes.js            # validasi gift code (hash-based, auto-generated)
├── game/
│   └── GameStage.js        # ENGINE — Skia renderer + RAF loop (file terbesar)
├── components/
│   ├── Glass.js            # panel frosted-glass (inti glassmorphism)
│   ├── BottomNav.js        # tab bar glass (Play/Ranks/Skins/Settings)
│   ├── Buttons.js          # PrimaryButton dll.
│   ├── Icons.js            # ikon SVG
│   ├── Orb.js              # preview orb statis (dipakai di menu/toko)
│   ├── Float.js            # animasi mengambang (Reanimated)
│   ├── SkyBackground.js    # latar langit untuk layar menu
│   ├── MenuScreen.js       # scroll container untuk layar menu
│   └── Controls.js         # toggle/segmented control settings
├── screens/
│   ├── HomeScreen.js       # tab Play (best, statistik, tombol main)
│   ├── LeaderboardScreen.js# tab Ranks (top-50 global + Game Center)
│   ├── CosmeticsScreen.js  # tab Skins (grid skin, locked → paywall)
│   ├── SettingsScreen.js   # tab Settings (toggle, difficulty, restore, redeem)
│   ├── GameOverOverlay.js  # overlay setelah mati (retry/revive/home)
│   ├── PaywallModal.js     # paywall kustom
│   └── _ScreenHead.js      # header layar bersama (eyebrow + judul)
└── utils/
    ├── color.js            # hexToRgb, mixHex, rgba
    └── format.js           # fmtNum, fmtTime, fmtPrice

modules/
└── expo-game-center/       # native module lokal (Swift/GameKit)
    ├── expo-module.config.json
    ├── index.js
    └── ios/
        ├── ExpoGameCenter.podspec
        └── ExpoGameCenterModule.swift
```

**Prinsip pemisahan:** `theme.js` adalah satu-satunya tempat warna & angka game.
`config.js` adalah satu-satunya tempat kunci/ID layanan. Semua I/O eksternal
(storage, IAP, leaderboard) dibungkus modul yang **degrade jadi no-op** kalau native
module tidak ada — sehingga JS bundle tetap jalan tanpa crash.

---

## 6. Lapisan 1 — Theme (Sumber Kebenaran Visual)

`theme.js` mengekspor: palet glass (`ASC`), band ketinggian/level (`ASC_BANDS` +
`skyAt`), katalog skin (`ASC_SKINS`), dan nama font (`FONT`). Semua layar & engine
membaca dari sini — **jangan hardcode warna di tempat lain**.

### Palet glass
```js
export const ASC = {
  ink: '#0F1A2B',                    // teks utama di atas langit terang
  ink2: 'rgba(15,26,43,0.62)',
  ink3: 'rgba(15,26,43,0.40)',
  inkOn: '#F4F8FF',                  // teks di atas langit gelap (luar angkasa)
  inkOn2: 'rgba(244,248,255,0.66)',
  glass: 'rgba(255,255,255,0.30)',   // permukaan kaca standar
  glassHi: 'rgba(255,255,255,0.46)', // kaca terang
  glassDk: 'rgba(255,255,255,0.16)',
  hair: 'rgba(255,255,255,0.55)',    // garis tepi rambut (hairline)
  hairDk: 'rgba(255,255,255,0.18)',
  shadow: 'rgba(20,40,80,0.22)',
  gold: '#F2B33D', mint: '#4FE0B0', sky: '#5AA9F2',
  violet: '#A98CF5', rose: '#F2719B', danger: '#FF6B5E',
};
```

### Band/level dengan interpolasi kontinu
Konsep ini bisa kamu pakai untuk *progresi visual apa pun* (kedalaman laut, waktu
hari, dunia). Tiap band adalah anchor; `skyAt(value)` menginterpolasi warna di antara
anchor secara mulus seiring skor naik:

```js
export const ASC_BANDS = [
  { at: 0,     top: '#BFE3D0', bot: '#EAF3E4', fog: '#FFFFFF', dark: false, name: 'Meadow' },
  { at: 400,   top: '#7FC8E8', bot: '#CDEBF0', fog: '#EAF6FB', dark: false, name: 'Open Sky' },
  { at: 1200,  top: '#4E93D8', bot: '#9FD0EE', fog: '#DCEBFB', dark: false, name: 'High Sky' },
  // ... naik terus sampai luar angkasa (dark: true)
  { at: 12000, top: '#02030A', bot: '#080A1C', fog: '#141738', dark: true,  name: 'Orbit' },
];

export function skyAt(alt) {
  const B = ASC_BANDS;
  if (alt <= B[0].at) return { ...B[0] };
  if (alt >= B[B.length - 1].at) return { ...B[B.length - 1] };
  let i = 0;
  while (i < B.length - 1 && B[i + 1].at <= alt) i++;
  const a = B[i], b = B[i + 1];
  const t = (alt - a.at) / (b.at - a.at);
  return {
    top: mixHex(a.top, b.top, t),
    bot: mixHex(a.bot, b.bot, t),
    fog: mixHex(a.fog, b.fog, t),
    dark: t > 0.5 ? b.dark : a.dark,
    name: t > 0.5 ? b.name : a.name,
  };
}
```
Flag `dark` menggerakkan gaya status bar dan warna teks (terang vs gelap).

### Katalog skin (kosmetik prosedural)
Daripada menulis 50 skin manual, definisikan spesifikasi `[nama, hue, sat, light,
hueShift, tag]` lalu generate gradien dua-warna via HSL→hex:

```js
function makeSkin([name, h, s, l, cs, tag]) {
  const c1 = hslToHex(h, s, l);
  const c2 = hslToHex(h + cs, s, l);              // warna kedua (gradien)
  const glow = hslToHex(h + cs / 2, Math.min(s + 0.06, 1), Math.min(0.64, l + 0.08));
  const trail = hslToHex(h + cs / 2, s * 0.72, Math.min(0.84, l + 0.18));
  const core = hslToHex(h, Math.min(s * 0.4, 0.4), 0.93);
  return { id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, c1, c2, glow, core, trail, price: 0, tag };
}

export const ASC_SKINS = [
  { id: 'drift', name: 'Drift', c1: '#FFFFFF', c2: '#D6ECFF', /* ...free default */ price: 0, tag: 'Default' },
  ...SKIN_SPECS.map(makeSkin),     // 48 skin hasil generate
  { id: 'aurora', /* ... */ rainbow: true },   // skin animasi spesial
];

export function skinById(id) { return ASC_SKINS.find((s) => s.id === id) || ASC_SKINS[0]; }
```

### Font
```js
export const FONT = {
  display: 'SpaceGrotesk_700Bold', displaySemi: 'SpaceGrotesk_600SemiBold',
  sans: 'PlusJakartaSans_500Medium', sansSemi: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold', sansExtra: 'PlusJakartaSans_800ExtraBold',
  mono: 'JetBrainsMono_500Medium', monoSemi: 'JetBrainsMono_600SemiBold',
};
```
Tiga peran: **display** (judul besar), **sans** (teks UI), **mono** (angka/skor —
mono membuat digit tidak "loncat" saat berubah).

### Utility warna (`utils/color.js`)
```js
export function hexToRgb(h) { /* '#rrggbb' → [r,g,b] */ }
export function mixHex(a, b, t) { /* interpolasi dua hex → '#rrggbb' */ }
export function rgba(hex, a) { /* hex + alpha → 'rgba(r,g,b,a)' — Skia lebih suka ini */ }
```

---

## 7. Lapisan 2 — Persistence (Offline Storage)

`storage.js` — wrapper async tipis di atas AsyncStorage, semua key di-prefix:

```js
import AsyncStorage from '@react-native-async-storage/async-storage';
const PREFIX = 'pivot.';

export const LS = {
  async get(key, fallback) {
    try {
      const v = await AsyncStorage.getItem(PREFIX + key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  },
  async set(key, value) {
    try { await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) {}
  },
  async multiGet(keys) {     // keys: [['best', 0], ['skin', 'drift'], ...]
    const out = {};
    await Promise.all(keys.map(async ([k, d]) => { out[k] = await LS.get(k, d); }));
    return out;
  },
};

// Kunci tanggal lokal (YYYY-MM-DD) untuk reset harian (mis. revive gratis/hari).
export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
```

Pola: setiap nilai berbentuk JSON, fallback aman, dan tidak pernah `throw`.
`today()` memungkinkan fitur "harian" (revive gratis, reward harian) tanpa server.

---

## 8. Lapisan 3 — App Shell & State Machine

`App.js` adalah otak aplikasi. Satu komponen `Game()` menyimpan semua state.

### Dua pola persistence yang wajib dipahami

**(1) Load sekali, lalu persist per-key.** Satu effect menghidrasi semua dari storage
saat mount; lalu **satu `useEffect` per key** menuliskannya kembali saat berubah
(digerbang flag `loaded` supaya tidak menimpa dengan nilai default sebelum hidrasi).

```js
const [loaded, setLoaded] = useState(false);
const [best, setBest] = useState(0);
const [equipped, setEquipped] = useState('drift');
// ... state lain

// load sekali
useEffect(() => {
  let alive = true;
  (async () => {
    const s = await LS.multiGet([
      ['best', 0], ['games', 0], ['playtime', 0],
      ['skin', 'drift'], ['revive', { date: '', used: 0 }],
      ['settings', DEFAULT_SETTINGS], ['tweaks', DEFAULT_TWEAKS], ['giftPro', false],
    ]);
    if (!alive) return;
    setBest(s.best); setEquipped(s.skin); /* ...set semua */
    setLoaded(true);
  })();
  return () => { alive = false; };
}, []);

// persist per-key (setelah load)
useEffect(() => { if (loaded) LS.set('best', best); }, [best, loaded]);
useEffect(() => { if (loaded) LS.set('skin', equipped); }, [equipped, loaded]);
// ... satu effect per field
```
> **Menambah field tersimpan baru?** Perluas daftar `multiGet` *dan* tambahkan satu
> write-effect yang cocok. Itu kontraknya.

**(2) Restart by remount.** Memulai/mengulang run menaikkan `runKey`, yang dipakai
sebagai `key` pada `<GameStage>`. React melepas & memasang ulang engine → dunia bersih.
`reviveAt` adalah counter terpisah yang diawasi engine untuk "menghidupkan kembali" di
tempat tanpa remount.

```js
const [runKey, setRunKey] = useState(1);
const [reviveAt, setReviveAt] = useState(0);
const [mode, setMode] = useState('menu');   // menu | playing
const [tab, setTab] = useState('play');      // play | ranks | skins | settings

const startGame = () => { setOver(null); setRunKey(k => k + 1); setMode('playing'); };
const retry     = () => { setOver(null); setRunKey(k => k + 1); };       // remount → dunia baru
const reviveNow = () => { /* cek kuota */ setOver(null); setReviveAt(x => x + 1); }; // tanpa remount
```

### Init layanan (sekali)
```js
useEffect(() => {
  let alive = true;
  authenticateGameCenter();                       // sign-in Apple ID — tanpa UI
  initIAP((isPro) => { if (alive) setEntitlementPro(isPro); }); // listener entitlement
  (async () => {
    const [proNow, price] = await Promise.all([getProStatus(), getOfferingPrice()]);
    if (!alive) return;
    setEntitlementPro(proNow);
    if (price) setProPrice(price);
  })();
  return () => { alive = false; };
}, []);
```

### Derived state (turunan)
```js
const pro = entitlementPro || giftPro;            // Pro dari RevenueCat ATAU gift code
const owned = pro ? ALL_SKIN_IDS : DEFAULT_OWNED; // Pro buka semua skin
const skin = skinById(owned.includes(equipped) ? equipped : 'drift');
const revivesUsed = revive.date === today() ? revive.used : 0;
const hasFreeRevive = pro || revivesUsed < FREE_REVIVES_PER_DAY;
```

### Render: pilih dunia, lalu pilih tab
```js
let screen;
if (mode === 'playing') {
  screen = (
    <View style={{ flex: 1 }}>
      <GameStage key={runKey} skin={skin} runKey={runKey} reviveAt={reviveAt}
        paused={!!over} difficulty={tweaks.difficulty}
        onGameOver={handleGameOver} onBand={onBand}
        width={width} height={height} topInset={topInset} />
      {over && <GameOverOverlay {...} onRetry={retry} onRevive={reviveNow} onHome={goHome} />}
    </View>
  );
} else if (tab === 'play')  screen = <HomeScreen {...} onPlay={startGame} />;
else if (tab === 'ranks')   screen = <LeaderboardScreen {...} />;
else if (tab === 'skins')   screen = <CosmeticsScreen {...} onUnlock={unlockPro} />;
else                        screen = <SettingsScreen {...} />;

return (
  <View style={[styles.root, { backgroundColor: dark ? '#070A1B' : '#79C7E8' }]}>
    <StatusBar style={dark ? 'light' : 'dark'} />
    {screen}
    {mode !== 'playing' && <BottomNav tab={tab} setTab={setTab} bottomInset={bottomInset} />}
    {paywall && <PaywallModal onClose={...} onPurchased={onPaywallPurchased} />}
  </View>
);
```

### Memuat font sebelum render
```js
export default function App() {
  const [fontsLoaded, fontError] = useFonts({ /* semua weight */ });
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: '#79C7E8' }} />;
  return <SafeAreaProvider><Game /></SafeAreaProvider>;
}
```

---

## 9. Lapisan 4 — Game Engine (Skia + RAF)

`game/GameStage.js` adalah inti game. Ini bagian tersulit; pahami 4 pola berikut.

### Pola A — Semua state mutable di satu ref
```js
const g = useRef(null);   // SELURUH dunia game ada di sini, BUKAN useState
const [, setFrame] = useState(0);  // hanya untuk memicu repaint

function freshWorld() {
  return {
    W, H, ballX: W * 0.32, ballY: H * 0.42, vel: 0, rot: 0,
    obstacles: [], spawnX: W + 60, scoreF: 0, score: 0,
    trail: [], sparks: [], clouds: seedClouds(), stars: seedStars(),
    pops: [], shake: 0, band: 'Meadow', started: false, dead: false,
    t: 0, last: 0, elapsed: 0, flashRevive: 0,
  };
}

useEffect(() => { g.current = freshWorld(); setPhaseBoth('ready'); }, [runKey]);
```

### Pola B — Mirror props ke refs (loop mounted sekali baca nilai terkini)
Loop RAF dipasang **sekali** dan hidup selama komponen. Tapi props (`skin`, `paused`,
`difficulty`, callback) bisa berubah di tengah run. Solusinya: cermin tiap prop ke ref
setiap render, sehingga loop selalu baca nilai terbaru **tanpa restart**.

```js
const skinRef = useRef(skin);
const pausedRef = useRef(paused);
const difRef = useRef(difficulty);
const onGameOverRef = useRef(onGameOver);
skinRef.current = skin;            // diperbarui tiap render
pausedRef.current = paused;
difRef.current = difficulty;
onGameOverRef.current = onGameOver;
```

### Pola C — Satu RAF loop, delta-time
```js
useEffect(() => {
  let raf;
  const loop = (ts) => {
    const w = g.current;
    if (w) {
      if (!w.last) w.last = ts;
      let dt = (ts - w.last) / 1000;
      w.last = ts;
      if (dt > 0.05) dt = 0.05;     // clamp lonjakan (mis. setelah app di-background)
      const running = phaseRef.current === 'run' && w.started && !w.dead && !pausedRef.current;
      if (running) step(w, dt);
      else if (!w.started && !pausedRef.current) idle(w, dt);
    }
    setFrame((f) => (f + 1) % 1000000);   // picu repaint
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(raf);
}, []);
```

### Pola D — Fisika constants-driven + kurva kesulitan
```js
const BALL_R = 15, GRAVITY = 2000, FLAP = 560;
const DIFF = {
  chill:   { sp: 0.82, gap: 1.12 },
  normal:  { sp: 1,    gap: 1 },
  intense: { sp: 1.22, gap: 0.84 },
};

// Kurva: makin tinggi skor → makin cepat & gap makin sempit (di-skala oleh difficulty)
function diff(score) {
  const D = DIFF[difRef.current] || DIFF.normal;
  return {
    speed:    Math.min(360 * D.sp, (156 + score * 0.02) * D.sp),
    gapH:     Math.max(146 * D.gap, (248 - score * 0.0135) * D.gap),
    spacingX: Math.max(196, 320 - score * 0.012),
  };
}

function step(w, dt) {
  w.vel += GRAVITY * dt;            // gravitasi
  w.ballY += w.vel * dt;
  const d = diff(w.score);
  const dx = d.speed * dt;          // scroll dunia ke kiri
  w.obstacles.forEach((o) => { o.x -= dx; });
  // ... spawn, scoring, collision (AABB sederhana), partikel, parallax awan
}

const tap = () => {                 // input satu-tap
  const w = g.current;
  if (!w || pausedRef.current || phaseRef.current === 'dead') return;
  if (!w.started) { w.started = true; setPhaseBoth('run'); spawnObstacle(w); }
  w.vel = -FLAP;                    // dorong ke atas
  // spawn partikel spark
};
```

### Rendering Skia (deklaratif, dalam JSX)
Engine menggambar dengan komponen Skia di dalam `<Canvas>`. Semua membaca dari
`g.current` tiap repaint:

```jsx
<Pressable style={styles.fill} onPressIn={tap}>
  <Canvas style={styles.fill}>
    <Group transform={[{ translateX: sx }, { translateY: sy }]}>  {/* screen shake */}
      <Rect x={-20} y={-20} width={W+40} height={H+40}>
        <LinearGradient start={vec(0,0)} end={vec(0,H)} colors={[sky.top, sky.bot]} />
      </Rect>
      {sky.dark && w.stars.map(...)}     {/* bintang di band gelap */}
      {w.clouds.map(...)}                 {/* awan ber-blur (parallax) */}
      {w.obstacles.map((o,i) => <Pillar key={i} o={o} H={H} dark={sky.dark} />)}
      {w.trail.map(...)}                  {/* jejak orb */}
      {w.sparks.map(...)}                 {/* partikel */}
      <Ball x={w.ballX} y={w.ballY} rot={w.rot} skin={sk} />
    </Group>
  </Canvas>
  {/* HUD (skor) & overlay "Tap to rise" pakai <View>/<Text> biasa di atas kanvas */}
</Pressable>
```

Catatan teknis penting:
- Kanvas pakai `flex: 1`, **bukan tinggi piksel tetap** (di New Architecture tinggi
  tetap membuat surface kekecilan).
- `highQuality` setting menurunkan jumlah bintang/awan/partikel untuk perangkat lemah.
- Game over memanggil `Haptics.notificationAsync(...Error)` lalu `onGameOver(skor, detik)`.

---

## 10. Lapisan 5 — Bahasa UI Glassmorphism

Komponen `Glass` adalah jantung tampilan menu. Semua kartu/panel memakainya.

```jsx
import { BlurView } from 'expo-blur';

export default function Glass({ tone='reg', dark=false, radius=20, pad=16, intensity=24,
  style, innerStyle, children, onPress }) {
  const bg = tone === 'hi' ? (dark ? 'rgba(255,255,255,0.12)' : ASC.glassHi)
           : tone === 'dk' ? (dark ? 'rgba(255,255,255,0.05)' : ASC.glassDk)
           : (dark ? 'rgba(255,255,255,0.08)' : ASC.glass);
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper onPress={onPress} style={[{
      borderRadius: radius, shadowColor: ASC.shadow,
      shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 24, elevation: 8,
    }, style]}>
      <BlurView intensity={intensity} tint={dark ? 'dark' : 'light'}
        style={[{ borderRadius: radius, borderColor: dark ? ASC.hairDk : ASC.hair,
                  backgroundColor: bg, padding: pad, overflow: 'hidden', borderWidth: 1 }, innerStyle]}>
        {children}
      </BlurView>
    </Wrapper>
  );
}
```

Resep glassmorphism yang konsisten dipakai di seluruh app:
1. `BlurView` (expo-blur) untuk blur asli di belakang.
2. Lapisan `backgroundColor` putih semi-transparan di atasnya.
3. `borderWidth: 1` dengan warna "hairline" putih transparan.
4. `borderRadius` besar (20–26).
5. Shadow biru lembut untuk mengangkat panel dari langit.

Bottom nav juga memakai pola sama (`BlurView` + border + shadow) dengan ikon SVG dan
state `active` yang memberi latar putih pada ikon terpilih.

Komponen pendukung lain:
- `MenuScreen` — container scroll + `SkyBackground` di belakang.
- `Float` — animasi mengambang naik-turun (Reanimated) untuk hero orb.
- `Orb` — render preview orb statis (dipakai di home & toko) memakai gradien dari skin.
- `Buttons` — `PrimaryButton` dengan ikon + label.
- `Icons` — kumpulan ikon SVG (`react-native-svg`), di-port dari path SVG desain.

---

## 11. Lapisan 6 — Layar & Navigasi

Tidak ada library navigasi. `App.js` me-render salah satu layar berdasarkan `tab`.
Setiap layar menerima `width/height/topInset/bottomInset` (dari safe-area) sebagai props.

- **HomeScreen** (`play`) — wordmark, hero orb mengambang, kartu "Personal Best" dengan
  mini-stat (Runs, Playtime, Ceiling, Revive), tombol Play.
- **LeaderboardScreen** (`ranks`) — top-50 global dari Game Center; fallback ke preview
  seeded bila tak tersedia; tombol "View in Game Center".
- **CosmeticsScreen** (`skins`) — grid skin; skin terkunci membuka paywall saat ditekan;
  skin owned bisa di-equip.
- **SettingsScreen** (`settings`) — toggle (sound/haptics/reduce-motion/high-quality),
  segmented difficulty, restore purchases, redeem gift code, manage subscription, reset.
- **GameOverOverlay** — overlay di atas kanvas: skor, best, band, tombol Retry / Revive / Home.
- **PaywallModal** — paywall kustom (alternatif paywall ter-hosting RevenueCat).
- **_ScreenHead** — header bersama (eyebrow mono kecil + judul display besar).

Pola layar standar:
```jsx
<MenuScreen width={width} height={height}
  contentStyle={{ minHeight: height, paddingTop: topInset + 26, paddingBottom: bottomInset + 120, paddingHorizontal: 22 }}>
  <ScreenHead eyebrow="OFFLINE · ONE TAP" title="..." />
  <Glass tone="hi" pad={18} radius={24}> ... </Glass>
  <PrimaryButton label="Play" onPress={onPlay} />
</MenuScreen>
```

---

## 12. Lapisan 7 — Monetisasi (RevenueCat IAP)

Model: **satu pembelian non-consumable seumur hidup ("Pro")** yang memberi entitlement
tunggal → membuka semua skin + revive tak terbatas. **Tanpa iklan, tanpa langganan
berulang.** RevenueCat adalah sumber kebenaran (bukan disimpan lokal).

### `config.js` — semua kunci di satu tempat
```js
export const REVENUECAT_IOS_KEY = 'appl_xxxxxxxx';   // public SDK key (aman di-embed)
export const REVENUECAT_ANDROID_KEY = 'goog_xxxxxxxx';
export const ENTITLEMENT_ID = 'Pivot Pro';          // HARUS sama persis dgn dashboard
export const OFFERING_ID = null;                      // null = pakai offering "current"
export const PRO_PRODUCT_ID = 'lifetime';             // fallback product ID
export const PRO_FALLBACK_PRICE = '$3.99';            // harga tampilan bila store offline
export const IAP_CONFIGURED = !REVENUECAT_IOS_KEY.startsWith('REPLACE_ME');
export const isPlaceholder = (v) => typeof v !== 'string' || v.startsWith('REPLACE_ME');
```

### `iap.js` — pola "crash-proof, degrade ke no-op"
Setiap fungsi mengakses native module secara *lazy* via `require()` dalam `try/catch`.
Bila tidak ada (JS-only bundle / Android / build sebelum SDK di-compile), semuanya
mengembalikan no-op aman — app tidak pernah crash.

```js
function purchasesModule() { try { return require('react-native-purchases'); } catch { return null; } }
const Purchases = () => purchasesModule()?.default || null;

export function hasPro(info) { return !!info?.entitlements?.active?.[ENTITLEMENT_ID]; }

export function initIAP(onProChange) {
  const P = Purchases();
  if (!P || configured) return;
  const key = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  if (isPlaceholder(key)) return;                  // belum ada kunci → tetap no-op
  P.configure({ apiKey: key });
  configured = true;
  P.addCustomerInfoUpdateListener((info) => onProChange(hasPro(info)));  // sumber kebenaran
}

export async function getProStatus() { /* hasPro(await P.getCustomerInfo()) */ }
export async function restorePurchases() { /* hasPro(await P.restorePurchases()) */ }
export async function getOfferingPrice() { /* harga terlokalisasi dari offering current */ }
export async function presentCustomerCenter() { /* UI manage/restore/refund ala Apple */ }
export function isStoreAvailable() {
  const key = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  return Platform.OS === 'ios' && !!RevenueCatUI() && !isPlaceholder(key);
}
```

Kamu bisa pakai **paywall ter-hosting** (`presentPaywall()` dari
`react-native-purchases-ui` — didesain di dashboard) atau **paywall kustom**
(`getProOffering()` + `purchasePro(offer)` lalu render UI sendiri di `PaywallModal`).

### Alur di `App.js`
```js
const pro = entitlementPro || giftPro;          // listener RevenueCat menggerakkan entitlementPro
const owned = pro ? ALL_SKIN_IDS : ['drift'];   // skin terkunci → buka paywall
// Revive: gratis 1–3×/hari; lewat itu → paywall; Pro = tak terbatas
```

> Setup dashboard (produk, entitlement, offering, paywall, Customer Center) ada di
> file terpisah `MONETIZATION_SETUP.md`. Karena tanpa iklan, App Privacy menyatakan
> tidak ada advertising/tracking — hanya Purchases (+ Game Center).

---

## 13. Lapisan 8 — Leaderboard (Native Game Center Module)

Leaderboard global memakai **Apple Game Center** — **tanpa login UI** (GameKit auto-auth
dengan Apple ID device). Karena Expo tidak punya API GameKit, kita buat **native module
Expo lokal** di folder `modules/expo-game-center/`.

### Struktur module
```
modules/expo-game-center/
├── expo-module.config.json        # { "platforms": ["apple"], "apple": { "modules": ["ExpoGameCenterModule"] } }
├── index.js                       # requireOptionalNativeModule('ExpoGameCenter')
└── ios/
    ├── ExpoGameCenter.podspec      # frameworks: GameKit, UIKit; deps: ExpoModulesCore
    └── ExpoGameCenterModule.swift  # implementasi GameKit
```

### `index.js` — ambil module secara opsional
```js
import { requireOptionalNativeModule, requireNativeModule } from 'expo-modules-core';
const ExpoGameCenter = requireOptionalNativeModule
  ? requireOptionalNativeModule('ExpoGameCenter')
  : (() => { try { return requireNativeModule('ExpoGameCenter'); } catch { return null; } })();
export default ExpoGameCenter;
```

### Swift — fungsi yang diekspos
`ExpoGameCenterModule.swift` mengekspos `AsyncFunction`:
- `authenticate()` → bool. Memasang `GKLocalPlayer.local.authenticateHandler` **sekali**.
  > Jebakan penting: handler GameKit long-lived & bisa fire berkali-kali — JANGAN
  > pernah capture satu Promise di dalamnya (resolve dua kali = crash). Parkir promise
  > yang menunggu di array, lalu resolve & clear saat handler settle.
- `isAuthenticated()` → bool.
- `submitScore(score, leaderboardID)` — Game Center otomatis menyimpan skor tertinggi.
- `presentLeaderboard(leaderboardID)` — buka UI leaderboard native Apple.
- `loadTopScores(leaderboardID, count)` → `[{ rank, name, score, me }]` untuk dirender
  di UI glass sendiri.

`podspec` mendeklarasikan framework `GameKit` + `UIKit` dan dependency `ExpoModulesCore`.

### `leaderboard.js` — wrapper aman (JS)
```js
function gc() { try { return require('../modules/expo-game-center').default; } catch { return null; } }
export const isLeaderboardAvailable = () => Platform.OS === 'ios' && !!gc();

export async function authenticateGameCenter() { const m = gc(); return m ? m.authenticate() : false; }
export async function submitScore(score, difficulty) {
  const m = gc();
  if (!m || !score || score <= 0) return false;
  return m.submitScore(Math.floor(score), leaderboardIdFor(difficulty));
}
export async function loadTopScores(difficulty, count = 50) {
  const m = gc(); if (!m) return [];
  const rows = await m.loadTopScores(leaderboardIdFor(difficulty), count);
  return Array.isArray(rows) ? rows : [];
}
```

### Config & entitlement
```js
// config.js — satu leaderboard per difficulty
export const GAME_CENTER_LEADERBOARDS = {
  chill: 'pivot.altitude.chill', normal: 'pivot.altitude.normal', intense: 'pivot.altitude.intense',
};
export const leaderboardIdFor = (d) => GAME_CENTER_LEADERBOARDS[d] || GAME_CENTER_LEADERBOARDS.normal;
```
Di `app.json`: `"entitlements": { "com.apple.developer.game-center": true }`. Buat
leaderboard ID yang sama persis di App Store Connect → Game Center → Leaderboards.

> Native module **butuh dev/EAS build baru** agar ter-compile. Di Expo Go / JS bundle
> ia tidak ada, dan wrapper otomatis no-op. Langkah App Store Connect ada di
> `LEADERBOARD_SETUP.md`.

---

## 14. Lapisan 9 — Gift Codes (Unlock Lokal)

Memberi Pro gratis tanpa server, dengan kode yang tidak mudah dipalsukan: **hanya hash
yang dibundel**, kode plain disimpan terpisah (gitignored, tidak ikut bundle).

```js
// giftcodes.js (AUTO-GENERATED oleh scripts/gen-gift-codes.js)
const HASHES = new Set([3618371213, 3923837472, /* ...100 hash */]);
function djb2(s) { let h = 5381; for (let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))>>>0; return h>>>0; }
export function isValidGiftCode(code) {
  if (!code) return false;
  return HASHES.has(djb2(String(code).trim().toUpperCase()));
}
```

Di `App.js`: redeem code valid → `setGiftPro(true)` + `LS.set('giftPro', true)`, lalu
penuhi intent paywall (equip skin / revive). `pro = entitlementPro || giftPro`, jadi
gift code men-unlock hal yang sama seperti pembelian. Script `gen-gift-codes.js` membuat
ulang `giftcodes.js` (hash) + `GIFT_CODES.txt` (plain, gitignored).

---

> Mulai sini adalah **pekerjaan akun/dashboard** yang hanya bisa kamu lakukan di
> luar kode. Kode-nya sudah siap; ini langkah-langkah konkret di tiap portal supaya
> akhirnya benar-benar "tinggal deploy & submit". Lakukan **berurutan**.

## 15. Setup Akun: developer.apple.com & Certificate

### a. Prasyarat akun
- **Akun Apple Developer berbayar** ($99/tahun) — wajib untuk submit ke App Store,
  IAP, dan Game Center. Catat **Apple Team ID** kamu (mis. `JWYH3R2628`) dan isikan
  ke `eas.json` → `submit.production.ios.appleTeamId`.
- **Paid Apps Agreement** harus **Active** sebelum IAP berfungsi: App Store Connect →
  Business → Agreements, Tax, and Banking. *Tanpa ini, IAP tidak jalan sama sekali.*

### b. App ID + Capabilities (developer.apple.com → Identifiers)
1. Buat (atau buka) **App ID** dengan bundle `com.<kamu>.<app>` — harus sama persis
   dengan `app.json` → `ios.bundleIdentifier`.
2. Aktifkan capability:
   - **Game Center** (untuk leaderboard).
   - **In-App Purchase** (biasanya otomatis aktif untuk app berbayar IAP).

### c. Certificate & Provisioning Profile — biarkan EAS yang urus
**Kamu tidak perlu membuat certificate manual.** Saat `eas build` pertama, pilih
**"Let EAS handle it"** — EAS otomatis membuat & mengelola Distribution Certificate
dan Provisioning Profile, serta meng-sync capability (termasuk Game Center) ke App ID.
Karena ini proyek **managed (CNG)**, folder `ios/` di-generate dari `app.json`, jadi
**jangan tambah entitlement manual di Xcode** (akan tertimpa saat prebuild berikutnya).
Entitlement Game Center sudah ada di `app.json` (`ios.entitlements`).

> Jika muncul error *"you must add the `com.apple.developer.game-center` entitlement in
> Xcode"* saat build lokal, regenerasi `ios/`:
> ```bash
> npx expo prebuild --clean -p ios   # menulis ulang ios/ dari app.json
> npx expo run:ios
> ```
> Verifikasi `ios/<App>/<App>.entitlements` memuat `com.apple.developer.game-center <true/>`.
> Untuk **release**, `eas build` selalu prebuild fresh dari `app.json`, jadi entitlement
> otomatis ikut.

### d. In-App Purchase Key (.p8) untuk RevenueCat
Agar RevenueCat bisa memvalidasi receipt:
1. App Store Connect → **Users and Access → Integrations → In-App Purchase** (atau
   Keys) → buat **In-App Purchase Key**, unduh file **`.p8`** (sekali saja!).
2. Catat **Issuer ID** dan **Key ID**. Ketiganya (`.p8` + Issuer ID + Key ID) kamu
   unggah ke RevenueCat (langkah 16).

---

## 16. Setup RevenueCat (Dashboard + Paywall)

Model bisnis: **satu pembelian non-consumable "Pro" seumur hidup** → entitlement
tunggal → buka semua skin + revive tak terbatas. Tanpa langganan, tanpa iklan.

### a. Buat produk IAP di App Store Connect dulu
App Store Connect → app kamu → **In-App Purchases** → **+** → **Non-Consumable**:
- **Product ID:** `lifetime` (atau `com.<kamu>.<app>.lifetime`) — harus cocok dengan
  `PRO_PRODUCT_ID` di `config.js` dan dengan yang kamu daftarkan di RevenueCat.
- **Reference Name:** "Pro Lifetime".
- **Price tier:** mis. $4.99.
- **Localization:** display name + deskripsi.
- Unggah **review screenshot**, set status → **Ready to Submit**.

### b. Konfigurasi RevenueCat (revenuecat.com)
1. **Project** baru → **+ App** untuk **Apple App Store**, isi bundle `com.<kamu>.<app>`.
2. Unggah **In-App Purchase Key** (`.p8` + Issuer ID + Key ID dari langkah 15d).
3. **Entitlements** → buat satu dengan identifier **persis** sama dengan
   `ENTITLEMENT_ID` di `config.js` (mis. `Pivot Pro` — termasuk spasi & kapitalisasi).
4. **Products** → tambahkan produk `lifetime`; **attach** ke entitlement tadi.
5. **Offerings** → buat satu offering, jadikan **default ("current")**; tambahkan
   produk `lifetime` sebagai **package "Lifetime"**.
6. **Paywalls** → desain paywall untuk offering itu. **Ini yang ditampilkan
   `presentPaywall()`.** Tanpa paywall yang dikonfigurasi, panggilan paywall
   mengembalikan "not presented".
7. **Customer Center** → aktifkan & konfigurasi (menggerakkan tombol "Manage purchases"
   / restore / refund).
8. Ambil **Public SDK Key** Apple (`appl_…`) dari RevenueCat → API Keys, dan isikan ke
   `REVENUECAT_IOS_KEY` di `src/config.js`. (Aman di-embed di klien.)

### c. Uji
Uji dengan **Sandbox Apple ID** (App Store Connect → Users and Access → **Sandbox
Testers**) di **build device asli** (StoreKit Simulator terbatas). Untuk uji cepat
tanpa store, tersedia `Pivot.storekit` (StoreKit config) — opsional.

---

## 17. Setup App Store Connect (IAP, Leaderboard, Privacy)

### a. Buat app
App Store Connect → **Apps → +** → New App: platform iOS, nama, bundle ID
`com.<kamu>.<app>`, SKU, bahasa utama.

### b. IAP `lifetime`
Sudah dibuat di langkah 16a. **Penting:** di halaman **versi** app, **tambahkan IAP
`lifetime` ke versi tersebut** agar di-review bersama build (kalau tidak, IAP tidak
ikut ditinjau).

### c. Leaderboard — buat TIGA (satu per difficulty)
App Store Connect → app → **Services → Game Center → Leaderboards** → tambah
**Classic** leaderboard untuk tiap difficulty, dengan **ID persis** seperti
`GAME_CENTER_LEADERBOARDS` di `config.js`:

| Difficulty | Leaderboard ID            | Nama yang disarankan |
|-----------|---------------------------|----------------------|
| Chill     | `pivot.altitude.chill`   | Altitude — Chill     |
| Normal    | `pivot.altitude.normal`  | Altitude — Normal    |
| Intense   | `pivot.altitude.intense` | Altitude — Intense   |

Untuk tiap board: **Score format** Integer, **Sort order** High to Low, rentang skor
opsional (mis. 0–10000000), dan nama terlokalisasi.

> Leaderboard baru kadang butuh waktu sebelum mulai menampilkan entri — daftar global
> kosong tepat setelah dibuat adalah normal. iOS-only; di Android wrapper no-op dan
> layar menampilkan preview seeded.

### d. App Privacy form (tanpa iklan, tanpa tracking)
Deklarasikan hanya:
- **Purchases** — riwayat pembelian (IAP Pro), untuk *App Functionality*. Bukan tracking.
- **Identifiers / User Content (Game Center)** — player ID + display name diproses
  Apple untuk *App Functionality*.
- **Tidak ada** advertising data, **tidak ada** Device-ID-for-ads, **tidak ada** ATT
  prompt. Di kuesioner age-rating, app **tidak** memuat iklan.
- **Privacy Policy URL wajib** (lihat bagian 19).

### e. Metadata versi & age rating
- **Primary category:** Games → Arcade; **Secondary:** Games → Casual.
- **Age rating:** 4+ (tanpa konten sensitif).
- **Price:** Free (dengan IAP).
- **Support URL** (wajib) & **Marketing URL** (opsional).
- **Screenshots** (wajib, min. iPhone 6.7" = 1290×2796) — ambil dari simulator
  (`Cmd+S`, atau `xcrun simctl io <UDID> screenshot /tmp/x.png`). Saran 5 shot:
  1. Home (orb + tagline), 2. Gameplay langit terang, 3. Band gelap dramatis
  (Aurora/Orbit), 4. Layar skin, 5. Leaderboard.

---

## 18. App Store Listing (Copy Siap Pakai)

Sesuaikan dengan game-mu; ini contoh dari Pivot (perhatikan batas karakter).

- **App Name** (≤30): `Pivot: One-Tap Climb`
- **Subtitle** (≤30): `Tap to rise. Dodge to survive.`
- **Promotional Text** (≤170, bisa diedit tanpa review): *One tap. One orb. Climb from
  the meadow to orbit and chase a new high score. No wifi, no clutter — just pure reflex.*
- **Keywords** (≤100, dipisah koma tanpa spasi):
  `one tap,arcade,offline,climb,endless,reflex,orb,dodge,high score,minimal,casual,skill,relax,flappy`
- **Description** (≤4000): paragraf pembuka mekanik → "RISE THROUGH EIGHT WORLDS" →
  "ONE TAP. INFINITE SKILL." → "PLAY ANYWHERE (offline)" → "MAKE THE ORB YOURS (skins)"
  → "CHASE THE LEADERBOARD" → "BUILT FOR FEEL (glassmorphism + haptics)".
- **What's New (v1.0.0):** catatan rilis pertama.

> Draft lengkap kata-per-kata bisa kamu simpan di `APP_STORE_LISTING.md` (sudah ada di
> repo Pivot sebagai contoh).

---

## 19. Privacy Policy & Support Page

Apple **mewajibkan Privacy Policy URL**, meski kamu hampir tidak mengumpulkan data.
- Sediakan dua halaman statis di folder `docs/`: `docs/privacy.html` (kebijakan privasi
  — sebutkan: tanpa iklan/tracking; Apple/Game Center & RevenueCat/Apple sebagai
  pemroses pembelian) dan `docs/index.html` (halaman support).
- **Host gratis di GitHub Pages**: Settings → Pages → source `docs/` di branch utama.
  URL hasilnya dipakai sebagai **Privacy Policy URL** & **Support URL** di App Store Connect.

---

## 20. Deploy & Submit (EAS) + Jebakan

### Langkah
1. **Prasyarat:** akun Apple Developer berbayar; ikon 1024×1024 **tanpa alpha**
   (regenerasi via `node scripts/gen-icon.js`); tentukan TestFlight vs rilis.
2. **Pasang CLI & cek:** `npm install -g eas-cli` lalu `npx expo-doctor@latest` (target 21/21).
3. **Verifikasi lokal dulu** (hemat kuota EAS):
   ```bash
   npx expo export --platform ios     # cek error JS/babel/import
   npx expo run:ios                   # compile native di Xcode lokal
   xcrun simctl io <UDID> screenshot /tmp/x.png   # konfirmasi render
   ```
4. **Commit semua** (EAS build dari snapshot git), lalu:
   ```bash
   eas login
   eas build  --platform ios --profile production   # "Let EAS handle it" utk credentials
   eas submit --platform ios --profile production
   ```
   > Native module (RevenueCat Purchases + Purchases-UI, Game Center) **butuh build
   > fresh ini** — tidak bisa hot-reload ke build lama.
5. **App Store Connect:** attach build baru, **tambahkan IAP `lifetime` ke versi**,
   lengkapi screenshot, deskripsi, Privacy Policy URL, App Privacy form, age rating →
   **Submit for Review**.

### Jebakan yang sudah terbukti menggigit (jangan diulang)
- **EAS "Install dependencies" gagal** → peer React 19 + Skia 2 + Reanimated 4 butuh
  `--legacy-peer-deps`. Diperbaiki oleh **`.npmrc`** (`legacy-peer-deps=true`) yang
  di-commit. Jaga `package-lock.json` sinkron.
- **Apple wajib Xcode 26+** (sejak 2026-04-28). EAS memilih image dari SDK: SDK 52 →
  Xcode 16 (ditolak); SDK 54+ → Xcode 26. Proyek ini SDK 56, `eas.json` pin
  `production.ios.image: "latest"`.
- **IAP tidak jalan** kalau Paid Apps Agreement belum Active, atau IAP belum
  di-attach ke versi, atau entitlement RevenueCat tidak sama persis dengan `config.js`.
- **Skia** dipakai deklaratif (Canvas/Group/Rect/Circle/gradients/BlurMask/vec) — aman
  dari v1→v2. API value lama (`useValue`/`useComputedValue`/`useTouchHandler`) **tidak**
  ada lagi — grep sebelum mengasumsikan.

---

## 21. Checklist Implementasi

Urutan membangun dari nol (tiap langkah bisa diverifikasi dengan `expo export`):

- [ ] **Bootstrap** — `create-expo-app`, salin `package.json`, `.npmrc`, `babel.config.js`, `index.js`.
- [ ] **Config** — `app.json` (bundle id, entitlement, orientasi), `eas.json`.
- [ ] **Theme** (`theme.js` + `utils/color.js`) — palet, band + `skyAt`, skin, font.
- [ ] **Storage** (`storage.js`) — `LS` + `today()`.
- [ ] **Glass UI** (`components/Glass.js`, `BottomNav`, `Buttons`, `Icons`, `Float`, `Orb`, `MenuScreen`, `SkyBackground`).
- [ ] **App shell** (`App.js`) — state, load-once + persist-per-key, runKey/reviveAt, render dunia/tab, useFonts.
- [ ] **Engine** (`game/GameStage.js`) — freshWorld di ref, mirror props, RAF loop, fisika, Skia render.
- [ ] **Screens** — Home, Leaderboard, Cosmetics, Settings, GameOverOverlay, PaywallModal, _ScreenHead.
- [ ] **Monetisasi** (`config.js` + `iap.js`) — RevenueCat init, paywall, restore, harga; setup dashboard.
- [ ] **Leaderboard** (`modules/expo-game-center/*` + `leaderboard.js`) — native module Swift, wrapper aman, entitlement.
- [ ] **Gift codes** (`giftcodes.js` + `scripts/gen-gift-codes.js`) — opsional.
- [ ] **Dev build** — `expo run:ios`, uji di simulator (native module + IAP butuh build asli).

**Akun & dashboard (bagian 15–19):**
- [ ] Apple Developer berbayar + **Paid Apps Agreement Active**; catat Team ID → `eas.json`.
- [ ] App ID `com.<kamu>.<app>` + capability **Game Center** & **In-App Purchase**.
- [ ] **In-App Purchase Key** (`.p8` + Issuer ID + Key ID) dibuat & diunduh.
- [ ] RevenueCat: project + app, unggah `.p8`, **entitlement** (sama persis), product
      `lifetime`, **offering default**, **paywall**, **Customer Center**; `appl_…` key → `config.js`.
- [ ] App Store Connect: buat app, IAP `lifetime` **di-attach ke versi**, **3 leaderboard**,
      App Privacy form, metadata, age rating, screenshot.
- [ ] **Privacy Policy + Support URL** di-host (GitHub Pages dari `docs/`).
- [ ] Listing (nama/subtitle/keywords/deskripsi) diisi.

**Deploy (bagian 20):**
- [ ] Verifikasi lokal (`expo export` → `expo run:ios` → screenshot), commit semua.
- [ ] `eas build -p ios --profile production` (→ "Let EAS handle it" untuk credentials).
- [ ] `eas submit -p ios --profile production`, lalu **Submit for Review** di App Store Connect.

---

## 22. Apakah "Tinggal Deploy & Submit"?

Jawaban jujur: **kode sudah lengkap & siap**, tetapi sebelum benar-benar bisa
deploy + submit, ada **pekerjaan akun/dashboard yang hanya bisa dilakukan manusia di
portal Apple & RevenueCat** — itu tidak bisa di-otomasi dari kode. Status tiap area:

| Area | Status di kode | Yang masih harus kamu lakukan manual |
|------|----------------|--------------------------------------|
| **Engine, UI, navigasi, offline** | ✅ Lengkap | — (tinggal jalan) |
| **Monetisasi (RevenueCat)** | ✅ Kode + key wired | Buat produk IAP, entitlement, **offering**, **paywall**, Customer Center di dashboard; sign Paid Apps Agreement; unggah `.p8` (bagian 16) |
| **Leaderboard (Game Center)** | ✅ Native module + entitlement | Buat **3 leaderboard** di App Store Connect; build native fresh (bagian 17c) |
| **Certificate / Profile** | n/a | **Otomatis oleh EAS** ("Let EAS handle it") — tidak perlu manual (bagian 15c) |
| **App Store listing** | ✅ Draft copy tersedia | Paste ke App Store Connect, **screenshot**, kategori, age rating (bagian 17e–18) |
| **Privacy Policy / Support** | ✅ Halaman `docs/` | Host di GitHub Pages → pasang URL (bagian 19) |
| **App Privacy form** | n/a | Isi: Purchases + Game Center, no ads/tracking (bagian 17d) |

**Kesimpulan:** ini **bukan** "satu tombol". Tapi panduan ini kini memuat **setiap
langkah konkret** untuk semua portal (developer.apple.com, App Store Connect,
RevenueCat) plus listing & privacy policy — jadi tidak ada lagi yang perlu kamu cari
di luar. Ikuti bagian **15 → 16 → 17 → 18 → 19 → 20** berurutan, dan setelah itu
benar-benar **tinggal `eas build` → `eas submit` → Submit for Review**.

> Catatan: certificate **tidak perlu** kamu buat manual — EAS mengelolanya. Yang
> "manual" hanyalah pengisian dashboard (produk, entitlement, paywall, leaderboard,
> form privasi, listing) yang memang harus lewat akun resmimu.

---

### Ringkasan mental model

> **Dua dunia** (menu RN ↔ game Skia) dipilih oleh `mode`. **Satu komponen** memegang
> semua state & mem-persist per-key. **Engine** menyimpan dunia di satu ref, jalan di
> satu RAF loop, membaca props lewat ref-mirror. **Theme** adalah satu-satunya sumber
> warna & angka. **Layanan eksternal** (storage/IAP/leaderboard) dibungkus modul yang
> degrade jadi no-op. Semuanya **offline-first, tanpa login**.

Salin pola-pola di atas, ganti mekanik "tap untuk terbang & hindari pillar" dengan
mekanik game-mu sendiri, dan seluruh kerangka di sekitarnya bisa dipakai ulang apa adanya.
