// "2 yurishda mot" masalalarini generatsiya qiladi: dvigatel oʻzi bilan oʻynaydi,
// har bir pozitsiya chess.js bilan toʻliq (aniq) tekshiriladi — yechim yagona boʻlishi shart.
// node tools/gen_puzzles.mjs <count> <seconds> <out.json> [seed]  (bir nechta seed bilan parallel ishlatish mumkin)
import { writeFileSync } from 'node:fs';
import { Chess } from '../js/vendor/chess.js';
import { search } from '../js/engine.js';

const [COUNT = '150', SECS = '420', OUT = 'puzzles.json', SEED = '12345'] = process.argv.slice(2);
const MATE = 32000;
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const deadline = Date.now() + +SECS * 1000;
let seed = +SEED;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);

function material(c, color) {
  let s = 0;
  for (const row of c.board()) for (const p of row) if (p) s += (p.color === color ? 1 : -1) * VAL[p.type];
  return s;
}

const uci = (m) => m.from + m.to + (m.promotion || '');
function hasMateInOne(c) {
  for (const m of c.moves({ verbose: true })) {
    c.move(m);
    const mate = c.isCheckmate();
    c.undo();
    if (mate) return uci(m);
  }
  return null;
}

/** Yagona birinchi yurishli 2 yurishda mot boʻlsa {m1, reply} qaytaradi. */
function mateInTwo(fen) {
  const c = new Chess(fen);
  if (hasMateInOne(c)) return null; // 1 yurishda mot — masala emas
  const sols = [];
  for (const m1 of c.moves({ verbose: true })) {
    c.move(m1);
    const replies = c.moves({ verbose: true });
    let all = replies.length > 0;
    let hardest = null, hardestCount = 99;
    for (const r of replies) {
      c.move(r);
      // nechta mot qiluvchi yurish bor: kamroq = qiyinroq himoya
      let mates = 0;
      for (const m2 of c.moves({ verbose: true })) { c.move(m2); if (c.isCheckmate()) mates++; c.undo(); }
      c.undo();
      if (!mates) { all = false; break; }
      if (mates < hardestCount) { hardestCount = mates; hardest = uci(r); }
    }
    c.undo();
    if (all) { sols.push({ m1: uci(m1), san: m1.san, capture: !!m1.captured, check: m1.san.includes('+'), reply: hardest }); if (sols.length > 1) return null; }
  }
  return sols.length === 1 ? sols[0] : null;
}

const found = new Map();
let games = 0;
while (found.size < +COUNT * 2 && Date.now() < deadline) {
  games++;
  const c = new Chess();
  const rand = 40 + Math.floor(rnd() * 120);
  for (let ply = 0; ply < 160 && !c.isGameOver() && Date.now() < deadline; ply++) {
    const fen = c.fen();
    if (ply >= 16) {
      const r = search(fen, { timeMs: 45, maxDepth: 4 });
      if (r.score >= MATE - 3 && r.score <= MATE - 3) {
        const key = fen.split(' ').slice(0, 4).join(' ');
        if (!found.has(key)) {
          const s = mateInTwo(fen);
          if (s) {
            const turn = fen.split(' ')[1];
            found.set(key, { fen, sol: [s.m1, s.reply], san: s.san, quiet: !s.capture && !s.check, mat: material(c, turn) });
            process.stdout.write(`\r${found.size} found, ${games} games`);
          }
        }
      }
    }
    const pick = search(fen, { timeMs: 30, randomness: rand });
    if (!pick.move) break;
    c.move({ from: pick.move.slice(0, 2), to: pick.move.slice(2, 4), promotion: pick.move[4] });
  }
}
// tanlov: tinch birinchi yurish va moddiy farq kichik boʻlganlari oldinda
const all = [...found.values()].sort((a, b) => (b.quiet - a.quiet) || (Math.abs(a.mat) - Math.abs(b.mat)));
const pick = all.slice(0, +COUNT);
// aralashtiramiz, kunlar ketma-ket bir xil boʻlmasin
for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
writeFileSync(OUT, JSON.stringify(pick.map(({ fen, sol }) => ({ fen, sol }))));
console.log(`\nsaved ${pick.length} (found ${found.size}, quiet ${all.filter((p) => p.quiet).length}) in ${games} games`);
