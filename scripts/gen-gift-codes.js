// Regenerate gift codes: writes src/giftcodes.js (djb2 hashes, committed) and
// GIFT_CODES.txt (plaintext, gitignored). Run: node scripts/gen-gift-codes.js
//
// Usage:
//   node scripts/gen-gift-codes.js [count]   # default 100, prefix "PIVOT"
// Keep the prefix in sync with the codes you hand out.

const fs = require('fs');
const path = require('path');

const COUNT = Number(process.argv[2]) || 100;
const PREFIX = process.argv[3] || 'PIVOT';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}
function block(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

const codes = new Set();
while (codes.size < COUNT) codes.add(`${PREFIX}-${block(4)}-${block(4)}`);
const list = [...codes];
const hashes = list.map((c) => djb2(c.toUpperCase()));

const root = path.join(__dirname, '..');
fs.writeFileSync(path.join(root, 'GIFT_CODES.txt'), list.join('\n') + '\n');

let out = `// Attune — gift-code unlock (no server, hard to forge): only the djb2 HASHES of
// valid codes are bundled here. The plaintext codes live separately in
// GIFT_CODES.txt (gitignored). Regenerate both with scripts/gen-gift-codes.js.

const HASHES = new Set([
`;
for (let i = 0; i < hashes.length; i += 8) out += '  ' + hashes.slice(i, i + 8).join(', ') + ',\n';
out += `]);

function djb2(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

export function isValidGiftCode(code) {
  if (!code) return false;
  return HASHES.has(djb2(String(code).trim().toUpperCase()));
}
`;
fs.writeFileSync(path.join(root, 'src', 'giftcodes.js'), out);
console.log(`Wrote ${COUNT} codes → GIFT_CODES.txt + src/giftcodes.js`);
