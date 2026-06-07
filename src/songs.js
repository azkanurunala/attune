// Attune — song catalogue + corridor segment patterns.
//
// A song is a list of segments. Each segment is a stretch of corridor with a
// normalized pitch (0 = low/wide wave, 1 = high/tight wave), a normalized gap
// (1 = forgiving, 0 = tight), and an optional companion wave (the late-game
// superposition layer). The engine turns these into the scrolling tunnel.
//
// Segment shape: { len, pitch, gap, comp?: { pitch, amp }, ramp? }
//   len   — length in world px
//   pitch — 0..1 target wave pitch (mapped to spatial frequency)
//   gap   — 0..1 corridor opening (mapped to px)
//   comp  — optional companion wave overlaid on the player (superposition)
//   ramp  — px over which pitch eases in from the previous segment (anticipation)

// Mapping constants (shared with the engine).
export const ATN_FMIN = 0.0042; // cycles per px (long, lazy wave)
export const ATN_FMAX = 0.0150; // cycles per px (tight, fast wave)
export const ATN_GAP_MIN = 96; // px (tight corridor) — widened for an easier band
export const ATN_GAP_MAX = 212; // px (wide corridor) — easy songs are very forgiving

export const atnPitchToFreq = (p) =>
  ATN_FMIN + (ATN_FMAX - ATN_FMIN) * Math.max(0, Math.min(1, p));
export const atnGapToPx = (g) =>
  ATN_GAP_MIN + (ATN_GAP_MAX - ATN_GAP_MIN) * Math.max(0, Math.min(1, g));

// ── Songs (curated difficulty curves) ────────────────────────────────────
export const ATN_SONGS = [
  {
    id: 'firstlight', title: 'First Light', palette: 'firstlight',
    bpm: 92, difficulty: 'easy', duration: '1:10',
    tagline: 'One clear tone, learning to find the channel.',
    segments: [
      { len: 1100, pitch: 0.34, gap: 1.0 },
      { len: 1100, pitch: 0.34, gap: 0.88 },
      { len: 1000, pitch: 0.52, gap: 0.82, ramp: 520 },
      { len: 1000, pitch: 0.40, gap: 0.78, ramp: 480 },
      { len: 1100, pitch: 0.46, gap: 0.74 },
    ],
  },
  {
    id: 'tide', title: 'Tide', palette: 'tide',
    bpm: 100, difficulty: 'easy', duration: '1:20',
    tagline: 'Slow swells. Ride the breath of the channel.',
    segments: [
      { len: 1000, pitch: 0.30, gap: 0.92 },
      { len: 900, pitch: 0.50, gap: 0.80, ramp: 460 },
      { len: 900, pitch: 0.30, gap: 0.78, ramp: 520 },
      { len: 900, pitch: 0.58, gap: 0.72, ramp: 440 },
      { len: 1000, pitch: 0.42, gap: 0.70, ramp: 480 },
      { len: 1000, pitch: 0.42, gap: 0.66 },
    ],
  },
  {
    id: 'drift', title: 'Drift', palette: 'drift',
    bpm: 116, difficulty: 'mid', duration: '1:30',
    tagline: "The channel keeps moving. Lead it, don't chase it.",
    segments: [
      { len: 850, pitch: 0.40, gap: 0.78 },
      { len: 700, pitch: 0.64, gap: 0.66, ramp: 320 },
      { len: 700, pitch: 0.32, gap: 0.64, ramp: 360 },
      { len: 700, pitch: 0.70, gap: 0.60, ramp: 300 },
      { len: 700, pitch: 0.46, gap: 0.58, ramp: 320 },
      { len: 700, pitch: 0.74, gap: 0.56, ramp: 280 },
      { len: 900, pitch: 0.50, gap: 0.58, ramp: 340 },
    ],
  },
  {
    id: 'ember', title: 'Ember', palette: 'ember',
    bpm: 120, difficulty: 'mid', duration: '1:35',
    tagline: 'Warmer, faster. The shifts come closer together.',
    segments: [
      { len: 800, pitch: 0.46, gap: 0.72 },
      { len: 620, pitch: 0.72, gap: 0.60, ramp: 280 },
      { len: 620, pitch: 0.38, gap: 0.56, ramp: 300 },
      { len: 560, pitch: 0.78, gap: 0.52, ramp: 240 },
      { len: 560, pitch: 0.30, gap: 0.52, ramp: 260 },
      { len: 620, pitch: 0.60, gap: 0.50, ramp: 260, comp: { pitch: 0.0, amp: 0.26 } },
      { len: 900, pitch: 0.52, gap: 0.56, ramp: 300, comp: { pitch: 0.0, amp: 0.26 } },
    ],
  },
  {
    id: 'resonance', title: 'Resonance', palette: 'resonance',
    bpm: 126, difficulty: 'hard', duration: '1:45',
    tagline: 'Two waves, one channel. Make the sum sing.',
    segments: [
      { len: 760, pitch: 0.50, gap: 0.66 },
      { len: 600, pitch: 0.74, gap: 0.56, ramp: 260 },
      { len: 600, pitch: 0.40, gap: 0.56, ramp: 280, comp: { pitch: 0.0, amp: 0.30 } },
      { len: 560, pitch: 0.68, gap: 0.52, ramp: 240, comp: { pitch: 0.0, amp: 0.32 } },
      { len: 560, pitch: 0.34, gap: 0.52, ramp: 260, comp: { pitch: 1.0, amp: 0.30 } },
      { len: 560, pitch: 0.80, gap: 0.50, ramp: 220, comp: { pitch: 1.0, amp: 0.34 } },
      { len: 600, pitch: 0.48, gap: 0.52, ramp: 260, comp: { pitch: 0.5, amp: 0.34 } },
      { len: 1000, pitch: 0.56, gap: 0.60, ramp: 320 },
    ],
  },
  {
    id: 'aurora', title: 'Aurora', palette: 'aurora',
    bpm: 110, difficulty: 'hard', duration: '1:50',
    tagline: 'The full arc — dissonance dissolving into light.',
    segments: [
      { len: 820, pitch: 0.36, gap: 0.74 },
      { len: 640, pitch: 0.66, gap: 0.60, ramp: 300 },
      { len: 600, pitch: 0.30, gap: 0.56, ramp: 320, comp: { pitch: 1.0, amp: 0.26 } },
      { len: 560, pitch: 0.76, gap: 0.52, ramp: 240, comp: { pitch: 0.0, amp: 0.30 } },
      { len: 560, pitch: 0.42, gap: 0.50, ramp: 260, comp: { pitch: 0.6, amp: 0.32 } },
      { len: 560, pitch: 0.82, gap: 0.50, ramp: 220, comp: { pitch: 0.2, amp: 0.32 } },
      { len: 600, pitch: 0.50, gap: 0.54, ramp: 260, comp: { pitch: 0.8, amp: 0.30 } },
      { len: 1200, pitch: 0.46, gap: 0.66, ramp: 360 },
    ],
  },
];
export const ATN_SONG_ORDER = ATN_SONGS.map((s) => s.id);
export const ATN_SONG_BY_ID = Object.fromEntries(ATN_SONGS.map((s) => [s.id, s]));

// Tutorial track — single slow tone, very wide gap, no shifts, no companion.
export const ATN_TUTORIAL = {
  id: 'tutorial', title: 'Tutorial', palette: 'firstlight',
  bpm: 84, difficulty: 'easy', duration: '0:40',
  segments: [
    { len: 1400, pitch: 0.40, gap: 1.0 },
    { len: 1200, pitch: 0.40, gap: 0.92 },
    { len: 1200, pitch: 0.56, gap: 0.9, ramp: 700 },
  ],
};

// ── Endless generator ─────────────────────────────────────────────────────
// Produces segments forever, ramping difficulty by elapsed distance. Always
// solvable: a single sine corridor is threadable by pitch-matching, and
// companion amplitude stays well under the player amplitude with a wider gap.
export function atnMakeEndlessGen(seed) {
  let s = (seed || 1) >>> 0;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  let dist = 0;
  let prevPitch = 0.4;
  return function next() {
    const d = Math.min(1, dist / 7000); // difficulty 0..1 saturating ~7000px
    const len = 900 - 380 * d + rnd() * 160; // segments shorten
    const swing = 0.28 + 0.42 * d; // pitch jumps grow
    let pitch = prevPitch + (rnd() * 2 - 1) * swing;
    pitch = Math.max(0.22, Math.min(0.82, pitch));
    const gap = 0.92 - 0.42 * d; // gap tightens
    const ramp = (0.55 - 0.28 * d) * len; // less warning over time
    const seg = { len, pitch, gap: Math.max(0.42, gap), ramp };
    if (d > 0.55 && rnd() < 0.45) {
      seg.comp = { pitch: rnd() < 0.5 ? 0 : 1, amp: 0.22 + 0.12 * d };
      seg.gap = Math.min(0.7, seg.gap + 0.12); // ease gap when companion active
    }
    prevPitch = pitch;
    dist += len;
    return seg;
  };
}
