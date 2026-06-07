// Optional access to the local Game Center native module. Returns null when the
// module isn't compiled in (Expo Go / Android / a JS-only bundle), so the JS
// wrapper in src/leaderboard.js can safely degrade to no-op.

import { requireOptionalNativeModule, requireNativeModule } from 'expo-modules-core';

const ExpoGameCenter = requireOptionalNativeModule
  ? requireOptionalNativeModule('ExpoGameCenter')
  : (() => {
      try { return requireNativeModule('ExpoGameCenter'); } catch (e) { return null; }
    })();

export default ExpoGameCenter;
