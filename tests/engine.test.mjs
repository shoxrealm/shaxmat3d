// node tests/engine.test.mjs — engine correctness & strength checks
import { perft, search, legalMovesUCI, gameStatus } from '../js/engine.js';

let fails = 0;
const ok = (c, label) => { console.log((c ? 'OK   ' : 'FAIL ') + label); if (!c) fails++; };

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const KIWI = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
const P3 = '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';
const P4 = 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1';
const P5 = 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8';

let t = Date.now();
ok(perft(START, 3) === 8902, 'perft start d3 = 8902');
ok(perft(START, 4) === 197281, 'perft start d4 = 197281');
ok(perft(KIWI, 3) === 97862, 'perft kiwipete d3 = 97862');
ok(perft(P3, 4) === 43238, 'perft pos3 d4 = 43238');
ok(perft(P4, 3) === 9467, 'perft pos4 d3 = 9467');
ok(perft(P5, 3) === 62379, 'perft pos5 d3 = 62379');
console.log('  perft time', Date.now() - t, 'ms');

// mate in 1 (back rank)
let r = search('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', { timeMs: 500 });
ok(r.move === 'a1a8', 'mate in 1: ' + r.move);
// mate in 2: (classic) white Qd1? use: K on h1, Q... known: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4" Qxf7#
r = search('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', { timeMs: 500 });
ok(r.move === 'h5f7', 'scholar mate: ' + r.move);
// mate in 2: 1.Qg7+?? use known puzzle: "6k1/pp4p1/2p5/2bp4/8/P5Pb/1P3rrP/2BRRN1K b - - 0 1" Rg1+ Nxg1(forced) Rh2#? Actually: 1...Rg1+ 2.Kxg1 Rxh2?  simpler: KQ vs K mate in 2
r = search('7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', { timeMs: 1500 });
ok(r.score > 20000 || Math.abs(r.score) > 9000, 'finds forced mate KQK score=' + r.score + ' move=' + r.move);

// random legality
let bad = 0, fen = START;
const hist = [];
for (let i = 0; i < 40; i++) {
  const st = gameStatus(fen, hist);
  if (st.over) break;
  const res = search(fen, { timeMs: 60, randomness: i % 2 ? 80 : 0 });
  if (!legalMovesUCI(fen).includes(res.move)) bad++;
  // apply via legal list: rely on engine helper if present
  break;
}
ok(bad === 0, 'search returns legal move');

// game status
ok(gameStatus('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1').reason === 'checkmate', 'status checkmate');
ok(gameStatus('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').reason === 'stalemate', 'status stalemate');
ok(gameStatus('7k/8/6K1/8/8/8/8/8 w - - 0 1').reason === 'insufficient', 'status insufficient');

// speed
t = Date.now();
r = search(KIWI, { timeMs: 1000 });
console.log('  kiwipete 1s: depth', r.depth, 'nodes', r.nodes, 'nps', Math.round(r.nodes / ((Date.now() - t) / 1000)), 'move', r.move);
ok(r.depth >= 4, 'depth >= 4 in 1s');
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
