// Generate assets/icon.png — a 1024×1024, alpha-free (RGB) Attune icon: deep
// navy field, a neon player wave with a soft glow + head dot. No external deps
// (zlib is built in). Run: node scripts/gen-icon.js
//
// Apple requires the marketing icon to be 1024×1024 with NO alpha channel, so we
// emit PNG color-type 2 (truecolor RGB).

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const S = 1024;

// ── palette (matches src/theme.js) ──
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const VOID = hex('#05070D');
const BG_TOP = hex('#0B2030');
const BG_BOT = hex('#0A1226');
const PLAYER = hex('#46E8E0');
const WALL = hex('#7C8CF8');
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const add = (base, col, k) => [base[0] + col[0] * k, base[1] + col[1] * k, base[2] + col[2] * k];

// distance from point to the wave curve y(x) (sampled — good enough at 1024px)
function waveGlow(px, py, amp, freq, phase, thickness, samples) {
  let best = 1e9;
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * S;
    const y = S / 2 + amp * Math.sin(x * freq + phase);
    const dx = x - px, dy = y - py;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < best) best = d;
  }
  // core line + exponential glow halo
  const core = Math.max(0, 1 - best / thickness);
  const glow = Math.exp(-best / 90);
  return { core, glow };
}

const raw = Buffer.alloc(S * (1 + S * 3)); // 1 filter byte per row + RGB
let p = 0;
for (let y = 0; y < S; y++) {
  raw[p++] = 0; // filter: none
  const vy = y / S;
  for (let x = 0; x < S; x++) {
    // background: vertical wash navy → void, plus a soft center radial
    let col = mix(mix(BG_TOP, BG_BOT, vy), VOID, 0.35);
    const cx = x - S * 0.5, cy = y - S * 0.42;
    const r = Math.sqrt(cx * cx + cy * cy) / S;
    col = add(col, mix(BG_TOP, PLAYER, 0.3), Math.max(0, 0.25 - r) * 1.4);

    // faint wall wave behind
    const w = waveGlow(x, y, S * 0.10, 0.010, 0.6, 7, 220);
    col = add(col, WALL, w.glow * 0.35 + w.core * 0.5);

    // bright player wave + glow
    const pw = waveGlow(x, y, S * 0.13, 0.010, 0.0, 9, 260);
    col = add(col, PLAYER, pw.glow * 0.85);
    col = mix(col, [255, 255, 255], pw.core * 0.9);

    // head dot at center
    const hx = x - S * 0.5, hy = y - (S / 2 + S * 0.13 * Math.sin(S * 0.5 * 0.010));
    const hd = Math.sqrt(hx * hx + hy * hy);
    col = add(col, PLAYER, Math.exp(-hd / 26) * 1.2);
    col = mix(col, [255, 255, 255], Math.max(0, 1 - hd / 14));

    raw[p++] = clamp(col[0]);
    raw[p++] = clamp(col[1]);
    raw[p++] = clamp(col[2]);
  }
}

// ── PNG assembly ──
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit, truecolor RGB
const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);

const out = path.join(__dirname, '..', 'assets');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.png'), png);
fs.writeFileSync(path.join(out, 'adaptive-icon.png'), png); // reuse for Android foreground
console.log(`Wrote assets/icon.png (${S}×${S}, no alpha, ${(png.length / 1024).toFixed(0)} KB)`);
