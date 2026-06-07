// Attune — dark neon-glass theme (the single source of truth for color + type).
//
// A deep-navy music-game look with neon player/wall colors per song. Every
// screen and the Skia engine read from here — don't hardcode color elsewhere.

import { mixHex } from './utils/color';

// ── Base dark shell (constant across songs) ──────────────────────────────
export const ATN_BASE = {
  void: '#05070D', // deepest background (behind everything)
  canvas: '#0A0E18', // app canvas
  canvasHi: '#0F1422', // slightly raised band
  glass: 'rgba(255,255,255,0.055)', // standard glass surface
  glassHi: 'rgba(255,255,255,0.10)',
  glassDk: 'rgba(255,255,255,0.03)',
  ink: '#EEF2FB', // primary text (cool white)
  ink2: '#9AA6C2', // secondary
  ink3: '#5E6982', // tertiary
  hair: 'rgba(255,255,255,0.12)', // hairline border
  hair2: 'rgba(255,255,255,0.06)',
  danger: '#FF5A6E',
};

// ── Per-song palettes ────────────────────────────────────────────────────
// player = your wave (neon line). wall = the tunnel walls. glow = bloom halo.
// bg1/bg2 = radial backdrop tints. accent = particle/CTA accent. mood = a word.
export const ATN_PALETTES = {
  firstlight: {
    name: 'First Light', mood: 'calm · curious',
    player: '#46E8E0', wall: '#7C8CF8', glow: '#46E8E0',
    bg1: '#0B2030', bg2: '#0A1226', accent: '#9BF5EE',
  },
  tide: {
    name: 'Tide', mood: 'open · drifting',
    player: '#4FC3FF', wall: '#34E0A8', glow: '#4FC3FF',
    bg1: '#08222E', bg2: '#0A1424', accent: '#A8E6FF',
  },
  drift: {
    name: 'Drift', mood: 'searching · momentum',
    player: '#9D7BFF', wall: '#4FD6E8', glow: '#9D7BFF',
    bg1: '#1A1136', bg2: '#0C1026', accent: '#C9B8FF',
  },
  ember: {
    name: 'Ember', mood: 'warm · rising',
    player: '#FFB454', wall: '#FF6FA3', glow: '#FFB454',
    bg1: '#2A1320', bg2: '#170C1C', accent: '#FFD9A0',
  },
  resonance: {
    name: 'Resonance', mood: 'tension · release',
    player: '#FF5FB0', wall: '#FFC24B', glow: '#FF5FB0',
    bg1: '#2A0E2A', bg2: '#140A20', accent: '#FFB3DE',
  },
  aurora: {
    name: 'Aurora', mood: 'luminous · vast',
    player: '#5BF2A8', wall: '#7C8CF8', glow: '#5BF2A8',
    bg1: '#0A2A2A', bg2: '#0A1430', accent: '#B6FFD9',
  },
};
export const ATN_PALETTE_ORDER = ['firstlight', 'tide', 'drift', 'ember', 'resonance', 'aurora'];

// Colorblind-safe override: high-contrast blue vs amber + dashed wall pattern.
export const ATN_CB_PALETTE = {
  player: '#4DA6FF', wall: '#FFC233', glow: '#4DA6FF', accent: '#BFE0FF',
};

// Resolve the active palette, applying the colorblind override when requested.
export function atnResolvePalette(paletteKey, colorblind) {
  const base = ATN_PALETTES[paletteKey] || ATN_PALETTES.firstlight;
  if (!colorblind) return base;
  return { ...base, ...ATN_CB_PALETTE };
}

// ── Fonts ──────────────────────────────────────────────────────────────────
// display = big titles · sans = UI text · mono = numbers/scores (no digit jump).
export const FONT = {
  display: 'SpaceGrotesk_500Medium',
  displaySemi: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
  sans: 'PlusJakartaSans_400Regular',
  sansMed: 'PlusJakartaSans_500Medium',
  sansSemi: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
  sansExtra: 'PlusJakartaSans_800ExtraBold',
  mono: 'JetBrainsMono_500Medium',
  monoSemi: 'JetBrainsMono_600SemiBold',
};

// re-export so screens can do per-song backdrop blends without re-importing
export { mixHex };
