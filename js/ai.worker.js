// AI worker: search() ni alohida oqimda ishlatadi, UI qotib qolmaydi.
import { search } from './engine.js';

self.onmessage = (e) => {
  const { id, fen, opts } = e.data;
  try {
    const r = search(fen, opts || {});
    self.postMessage({ id, ok: true, move: r.move, score: r.score, depth: r.depth, pv: r.pv });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
