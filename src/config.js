// Attune — single home for service keys / IDs. Replace the placeholders before
// shipping (see PANDUAN_IMPLEMENTASI.md §15–17).

// ── RevenueCat (premium one-time "Attune Pro") ──────────────────────────────
export const REVENUECAT_IOS_KEY = 'REPLACE_ME_appl_xxxxxxxx'; // public SDK key (safe to embed)
export const REVENUECAT_ANDROID_KEY = 'REPLACE_ME_goog_xxxxxxxx';
export const ENTITLEMENT_ID = 'Attune Pro'; // MUST match the RevenueCat dashboard exactly
export const OFFERING_ID = null; // null = use the "current" offering
export const PRO_PRODUCT_ID = 'lifetime'; // fallback product id
export const PRO_FALLBACK_PRICE = '$2.99'; // shown when the store is offline

export const isPlaceholder = (v) => typeof v !== 'string' || v.startsWith('REPLACE_ME');
export const IAP_CONFIGURED = !isPlaceholder(REVENUECAT_IOS_KEY);

// ── Game Center leaderboards (one per board) ────────────────────────────────
// Create boards with these exact IDs in App Store Connect → Game Center.
export const GAME_CENTER_LEADERBOARDS = {
  endless: 'attune.endless.distance', // Endless · distance
  score: 'attune.total.score', // Total score across songs
};
export const leaderboardIdFor = (board) =>
  GAME_CENTER_LEADERBOARDS[board] || GAME_CENTER_LEADERBOARDS.endless;
