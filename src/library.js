// Attune — the full library: 25 packs × 12 songs = 300, plus per-song
// procedural segment generation (deterministic by seed). Pack 1 ("First Set")
// is free and holds the six hand-crafted songs; the rest are Attune Premium.

import { ATN_PALETTE_ORDER } from './theme';
import { ATN_SONGS } from './songs';

export function atnMulberry(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const atnHash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

const ATN_ADJ = ['Pale', 'Distant', 'Molten', 'Glass', 'Hollow', 'Neon', 'Velvet', 'Silent', 'Electric', 'Lucid', 'Crystal', 'Cobalt', 'Amber', 'Dusk', 'Tidal', 'Lunar', 'Solar', 'Ember', 'Frost', 'Mirage', 'Phantom', 'Saffron', 'Indigo', 'Sable', 'Gilded', 'Quiet', 'Drowned', 'Paper', 'Wired', 'Slow'];
const ATN_NOUN = ['Drift', 'Pulse', 'Bloom', 'Current', 'Signal', 'Lattice', 'Horizon', 'Cascade', 'Echo', 'Spire', 'Halo', 'Vapor', 'Meridian', 'Lumen', 'Cinder', 'Static', 'Aurora', 'Tide', 'Reverie', 'Fathom', 'Glimmer', 'Strata', 'Nocturne', 'Resonance', 'Lull', 'Arc', 'Field', 'Veil', 'Channel', 'Hush'];
export function atnSongTitle(seed) {
  const r = atnMulberry(seed);
  return ATN_ADJ[Math.floor(r() * ATN_ADJ.length)] + ' ' + ATN_NOUN[Math.floor(r() * ATN_NOUN.length)];
}

const ATN_PACK_NAMES = [
  'First Set', 'Nightglow', 'Deep Tide', 'Ember Field', 'Violet Hours', 'Aurora Line',
  'Glass Cities', 'Undertow', 'Solar Wind', 'Paper Moons', 'Cobalt Drift', 'Static Bloom',
  'Lantern Sea', 'Wire & Bone', 'Slow Comet', 'Mirage Mile', 'Frost Signal', 'Saffron Dusk',
  'Phantom Tide', 'Lucid Strata', 'Molten Halo', 'Silent Spire', 'Indigo Fathom', 'Velvet Static', 'Last Light',
];
const ATN_TIER_OF_PACK = (i) => (i < 2 ? 'easy' : i < 8 ? 'mid' : i < 17 ? 'hard' : 'master');
export const ATN_TIER_BADGE = { easy: 'easy', mid: 'mid', hard: 'hard', master: 'master' };
const ATN_TIER_DIFF = { easy: 0.12, mid: 0.42, hard: 0.7, master: 0.92 };

// Build the packs. Pack 0 starts with the six curated songs.
export const ATN_PACKS = ATN_PACK_NAMES.map((name, p) => {
  const tier = ATN_TIER_OF_PACK(p);
  const palette = ATN_PALETTE_ORDER[p % ATN_PALETTE_ORDER.length];
  const songs = [];
  if (p === 0) {
    ATN_SONGS.forEach((s) =>
      songs.push({ ...s, packId: 'pack0', packName: name, seed: atnHash(0, songs.length + 1) }),
    );
  }
  for (let n = songs.length; n < 12; n++) {
    const seed = atnHash(p + 7, n + 13);
    const songPal = ATN_PALETTE_ORDER[(p + n) % ATN_PALETTE_ORDER.length];
    const dlevel = ATN_TIER_DIFF[tier];
    songs.push({
      id: 'p' + p + 's' + n,
      title: atnSongTitle(seed),
      palette: songPal,
      difficulty: tier === 'master' ? 'hard' : tier === 'easy' ? 'easy' : tier === 'mid' ? 'mid' : 'hard',
      tier,
      bpm: Math.round(92 + dlevel * 44 + atnMulberry(seed)() * 12),
      duration: ['1:10', '1:20', '1:30', '1:40', '1:50'][Math.floor(atnMulberry(seed + 1)() * 5)],
      seed,
      packId: 'pack' + p,
      packName: name,
    });
  }
  return { id: 'pack' + p, index: p, name, tier, palette, free: p === 0, count: songs.length, songs };
});

// Flat lookup id → song, and pack lookup.
export const ATN_LIBRARY = {};
ATN_PACKS.forEach((pk) => pk.songs.forEach((s) => { ATN_LIBRARY[s.id] = s; }));
export const ATN_PACK_BY_ID = Object.fromEntries(ATN_PACKS.map((pk) => [pk.id, pk]));
export const ATN_TOTAL_SONGS = ATN_PACKS.reduce((a, pk) => a + pk.count, 0);

// Procedural segment arc for a song (deterministic). Curated songs keep theirs.
export function atnSongSegments(song) {
  if (song.segments) return song.segments;
  const r = atnMulberry(song.seed || 1);
  const d = ATN_TIER_DIFF[song.tier || 'mid'];
  const gapBase = 0.96 - 0.42 * d;
  const segs = [];
  let pitch = 0.3 + r() * 0.22;
  const n = 5 + Math.round(d * 4);
  for (let i = 0; i < n; i++) {
    const len = 1180 - 520 * d - i * 18 + r() * 220;
    pitch = Math.max(0.24, Math.min(0.82, pitch + (r() * 2 - 1) * (0.3 + 0.42 * d)));
    let gap = Math.max(0.42, Math.min(1, gapBase - i * 0.02 + (r() - 0.5) * 0.1));
    const ramp = (0.56 - 0.26 * d) * len;
    const seg = { len: Math.round(len), pitch: +pitch.toFixed(3), gap: +gap.toFixed(3), ramp: i ? Math.round(ramp) : 0 };
    if (d > 0.55 && r() < 0.42) {
      seg.comp = { pitch: r() < 0.5 ? 0 : 1, amp: +(0.24 + 0.12 * d).toFixed(3) };
      seg.gap = +Math.min(0.72, seg.gap + 0.12).toFixed(3);
    }
    segs.push(seg);
  }
  segs[0].gap = Math.min(1, segs[0].gap + 0.1);
  segs[0].ramp = 0;
  return segs;
}

// Pack accessible? free pack or owner (purchased OR gift-unlocked).
export const atnPackUnlocked = (pack, progress) => pack.free || !!(progress && progress.purchased);
