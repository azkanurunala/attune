# Attune — Build & Submit to the App Store

Status of automation: the app is **build-ready** (expo-doctor 21/21, EAS project
linked as `@azkanura/attune`, icon generated, all config wired). The remaining
steps need **your Apple Developer account + portal work** and an interactive Apple
login, so run them yourself in a terminal. Do them in order.

Bundle id: `com.attune.game` · Entitlement: `Attune Pro` · IAP product: `lifetime`
(change the bundle id in `app.json` → `ios.bundleIdentifier` if that one is taken).

---

## 0. Prerequisites (one-time)
- Apple Developer Program active ($99/yr).
- **App Store Connect → Business → Agreements** → **Paid Apps Agreement = Active**
  (without this, IAP does not work at all).
- Logged into EAS already (`eas whoami` → `azkanura`). ✓

## 1. RevenueCat + IAP (you chose: keep the $2.99 paywall)
1. **App Store Connect → your app → In-App Purchases → +** → **Non-Consumable**
   - Product ID: `lifetime`  (must match `PRO_PRODUCT_ID` in `src/config.js`)
   - Reference name: "Attune Pro Lifetime", price tier ≈ $2.99, add a localization
     + review screenshot → status **Ready to Submit**.
   - On the app **version** page, **attach the `lifetime` IAP to the version** (else
     it isn't reviewed with the build).
2. **App Store Connect → Users and Access → Integrations → In-App Purchase** → create
   an **In-App Purchase Key**, download the `.p8`, note **Issuer ID** + **Key ID**.
3. **revenuecat.com** → new project → **+ App (Apple App Store)**, bundle
   `com.attune.game`. Upload the `.p8` + Issuer ID + Key ID.
   - **Entitlements** → create one with identifier **exactly** `Attune Pro`.
   - **Products** → add `lifetime`, attach it to that entitlement.
   - **Offerings** → create one, make it **current (default)**, add `lifetime` as a
     package. (Optional: design a Paywall + enable Customer Center.)
   - **API Keys** → copy the Apple **public** key (`appl_…`).
4. Paste it into `src/config.js`:
   ```js
   export const REVENUECAT_IOS_KEY = 'appl_xxxxxxxxxxxx';
   ```
   (Leave `ENTITLEMENT_ID = 'Attune Pro'` as-is.) Now the real purchase replaces the
   prototype's simulated unlock.

## 2. Game Center leaderboards
App Store Connect → your app → **Services → Game Center → Leaderboards** → add two
**Classic** boards (Integer, High→Low) with these **exact** IDs (from
`src/config.js`):
| Board | Leaderboard ID |
|---|---|
| Endless · distance | `attune.endless.distance` |
| Total score | `attune.total.score` |

## 3. App privacy + metadata (App Store Connect)
- **App Privacy**: declare only **Purchases** (App Functionality) and
  **Game Center identifiers/user content** (App Functionality). No ads, no tracking,
  no ATT prompt.
- Category: Games → Arcade (secondary: Music). Age rating 4+. Price: Free (with IAP).
- **Privacy Policy URL** + **Support URL** required (host a static page; GitHub
  Pages works).
- Screenshots (≥ iPhone 6.7" 1290×2796): Title, gameplay (bright), gameplay (climax
  palette), song map, leaderboard. Grab from the simulator:
  `xcrun simctl io booted screenshot /tmp/shot.png`.

## 4. Build (run in YOUR terminal — Apple login is interactive)
```bash
cd /Users/azkanurunala/attune
eas build --platform ios --profile production
#   → choose "Let EAS handle it" for credentials
#   → sign in with your Apple ID + 2FA (EAS creates the cert + profile and
#     syncs the Game Center capability to the App ID automatically)
```
The build runs on EAS servers (~15–35 min). RevenueCat + Skia + Game Center are
native, so this fresh build is required — you can't hot-reload them into an old one.

## 5. Submit
```bash
eas submit --platform ios --profile production
#   → picks the build you just made; can create the App Store Connect app record.
```
Then in App Store Connect: attach the build to the version, confirm the `lifetime`
**IAP is attached to the version**, finish metadata/screenshots/privacy →
**Submit for Review**.

---

---

## Troubleshooting

### Build fails: provisioning profile doesn't include the Game Center capability
```
Provisioning profile "…" doesn't include the com.apple.developer.game-center entitlement.
```
The entitlement is declared in `app.json`, but the **App ID** must also have the
Game Center capability turned on, and the profile must be regenerated afterwards.

1. **developer.apple.com → Certificates, Identifiers & Profiles → Identifiers →
   `com.attune.game`** → scroll to **Game Center** → tick it → **Save**.
2. Force EAS to regenerate the (now-stale) provisioning profile, then rebuild:
   ```bash
   eas credentials --platform ios
   #  → production → "Provisioning Profile" → Delete (EAS recreates it on build)
   eas build --platform ios --profile production
   ```
   (Re-running the build alone often suffices, since EAS reconciles the App ID's
   capabilities and regenerates the profile to match.)

To unblock a build *without* Game Center temporarily, remove
`"entitlements": { "com.apple.developer.game-center": true }` from
`app.json` → `ios` and the Ranks screen falls back to its seeded preview; add it
back (and re-do step 1–2) when you want live leaderboards.

### Sanity checks before submitting
- [ ] Paid Apps Agreement **Active**.
- [ ] `src/config.js` has your real `appl_…` key (not the `REPLACE_ME` placeholder).
- [ ] IAP `lifetime` exists, is **Ready to Submit**, and is **attached to the version**.
- [ ] RevenueCat entitlement id is **exactly** `Attune Pro`, offering is **current**.
- [ ] Both Game Center leaderboard IDs created and match `src/config.js`.
- [ ] Privacy Policy + Support URLs set; screenshots uploaded; age rating 4+.
- [ ] `eas build` chose Xcode-latest (set in `eas.json` → `production.ios.image`).
