// Darslardagi har bir topshiriqni tekshiradi: yurishlar qonuniy, mot kerak boʻlsa — mot mavjud.
import { Chess } from '../js/vendor/chess.js';
import { LESSONS } from '../js/lessons.js';

let fails = 0;
for (const l of LESSONS) {
  l.tasks.forEach((t, i) => {
    const label = `${l.id}#${i + 1}`;
    let c;
    try { c = new Chess(t.fen); } catch (e) { console.log('FAIL', label, 'bad fen', e.message); fails++; return; }
    if (c.isCheck() && c.turn() === 'w' && !t.fen.includes(' b ')) { /* allowed */ }
    for (const [k, s] of t.sol.entries()) {
      const opts = Array.isArray(s) ? s : [s];
      for (const u of opts) {
        const cc = new Chess(c.fen());
        try { cc.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { console.log('FAIL', label, 'illegal', u, 'step', k); fails++; }
      }
      const u = opts[0];
      try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { return; }
    }
    if (t.mate) {
      const mates = c.moves({ verbose: true }).filter((m) => { c.move(m); const x = c.isCheckmate(); c.undo(); return x; }).map((m) => m.san);
      if (!mates.length) { console.log('FAIL', label, 'no mate'); fails++; } else console.log('OK  ', label, 'mates:', mates.join(' '));
    } else console.log('OK  ', label, c.history().join(' '));
  });
}
console.log(fails ? `${fails} FAILED` : 'ALL OK');
process.exit(fails ? 1 : 0);
