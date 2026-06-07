// Color helpers — Skia prefers rgba() strings; mixHex powers per-song palette
// blends and the story video's cold→warm crossfade.

export function hexToRgb(h) {
  const s = String(h).replace('#', '');
  const v = s.length === 3
    ? s.split('').map((c) => c + c).join('')
    : s;
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ];
}

// interpolate two hex colors → '#rrggbb'
export function mixHex(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const [ra, ga, ba] = hexToRgb(a);
  const [rb, gb, bb] = hexToRgb(b);
  const h = (n) => Math.round(n).toString(16).padStart(2, '0');
  return '#' + h(ra + (rb - ra) * t) + h(ga + (gb - ga) * t) + h(ba + (bb - ba) * t);
}

// hex + alpha → 'rgba(r,g,b,a)'
export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// hex + 2-digit alpha suffix (e.g. "#46E8E0" + 0.12 → "#46E8E01F")
export function withAlpha(hex, a) {
  const s = String(hex).replace('#', '');
  const v = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const hh = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
  return '#' + v + hh;
}
