// Generator natijalarini birlashtiradi va js/puzzles.js ni yozadi.
// node tools/build_puzzles.mjs <out.js> <in1.json> [in2.json ...]
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from '../js/vendor/chess.js';

const [out, ...inputs] = process.argv.slice(2);
const seen = new Set(), list = [];
for (const f of inputs) {
  for (const p of JSON.parse(readFileSync(f, 'utf8'))) {
    const key = p.fen.split(' ').slice(0, 4).join(' ');
    if (seen.has(key)) continue;
    const c = new Chess(p.fen);
    try {
      c.move({ from: p.sol[0].slice(0, 2), to: p.sol[0].slice(2, 4), promotion: p.sol[0][4] });
      c.move({ from: p.sol[1].slice(0, 2), to: p.sol[1].slice(2, 4), promotion: p.sol[1][4] });
    } catch (e) { console.log('skip invalid', p.fen); continue; }
    if (!c.moves({ verbose: true }).some((m) => { c.move(m); const x = c.isCheckmate(); c.undo(); return x; })) { console.log('skip no mate', p.fen); continue; }
    seen.add(key); list.push(p);
  }
}
let seed = 2026;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }

writeFileSync(out, `// Kunlik masalalar: "2 yurishda mot". tools/gen_puzzles.mjs + tools/build_puzzles.mjs bilan yaratilgan,
// har birining yechimi yagona ekani chess.js bilan toʻliq tekshirilgan. sol = [birinchi yurish, raqib javobi].
export const PUZZLES = ${JSON.stringify(list.map(({ fen, sol }) => ({ fen, sol })))};

// 2026-11-07 (Toshkent) = 1-masala. Server (kunlik xabar) ham shu hisobni ishlatadi.
const DAY0 = Date.UTC(2026, 10, 7) / 86400000;
export function puzzleNumber(ms = Date.now()) {
  return Math.max(1, Math.floor((ms + 5 * 3600000) / 86400000) - DAY0 + 1);
}
// Oxirgi 60 tasi — "Mashq" (id 1001..1060), qolganlari kunlik masalalar uchun aylanadi.
export const PRACTICE = Math.min(60, Math.floor(PUZZLES.length / 3));
export const isPractice = (n) => n > 1000;
export function puzzleFor(n) {
  if (isPractice(n)) return PUZZLES[PUZZLES.length - (n - 1000)];
  return PUZZLES[(n - 1) % (PUZZLES.length - PRACTICE)];
}
`);
console.log('puzzles:', list.length);
