// Ikki brauzer oynasi onlayn oʻynaydi: A havola yaratadi, B qoʻshiladi, mat qilinadi.
// node tools/online_e2e.mjs <appUrl> <apiUrl> <outDir>
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [APP, API, OUT] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const logs = [];

async function browser(tag, port) {
  const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(process.env.TEMP, 'e2e_' + tag + port)}`,
    '--no-first-run', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--window-size=420,860', 'about:blank'], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 50 && !ws; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); const p = l.find((t) => t.type === 'page'); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); } } catch (e) { await sleep(200); }
  }
  let id = 0; const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') logs.push(`[${tag} EXCEPTION] ` + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(`[${tag} console.error] ` + m.params.args.map((a) => a.value ?? a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description; };
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 860, deviceScaleFactor: 1, mobile: true });
  let n = 0;
  const snap = async (name) => { const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 }); writeFileSync(join(OUT, `${tag}_${String(++n).padStart(2, '0')}_${name}.jpg`), Buffer.from(r.result.data, 'base64')); };
  // yurish: sahna orqali emas, toʻgʻridan-toʻgʻri onTap chaqiramiz (piksel qoplanishi testni buzmasin)
  const move = async (a, b) => { await ev(`__s3d.scene.onTap('${a}')`); await sleep(150); await ev(`__s3d.scene.onTap('${b}')`); };
  const ready = async () => { for (let i = 0; i < 60; i++) { if (await ev('typeof __s3d !== "undefined"') === true) return true; await sleep(1000); } return false; };
  return { ev, snap, move, ready, nav: (url) => send('Page.navigate', { url }), kill: () => { try { ws.close(); } catch (e) { /* */ } ch.kill(); } };
}

let A, B;
try {
  A = await browser('A', 9411); B = await browser('B', 9412);
  const q = (dev) => `${APP}?api=${encodeURIComponent(API)}&dev=${encodeURIComponent(dev)}`;
  await A.nav(q('3001:Aziz')); await A.ready(); await sleep(1500);
  await A.ev(`document.querySelector('#btnOnline').click()`); await sleep(800); await A.snap('online_menu');
  await A.ev(`document.querySelector('#btnInvite').click()`); await sleep(2500); await A.snap('waiting');
  const room = await A.ev('__s3d.S.online && __s3d.S.online.id');
  logs.push('ROOM ' + room);
  await B.nav(q('3002:Bobur') + '&room=' + room); logs.push('B ready ' + await B.ready()); await sleep(4000);
  await A.snap('a_started'); await B.snap('b_started');
  const youA = await A.ev('__s3d.S.online.room.you'), youB = await B.ev('__s3d.S.online.room.you');
  logs.push(`SEATS A=${youA} B=${youB} status=${await A.ev('__s3d.S.online.room.status')}`);
  const W = youA === 'w' ? A : B, K = W === A ? B : A;
  const seq = [[W, 'e2', 'e4'], [K, 'e7', 'e5'], [W, 'f1', 'c4'], [K, 'b8', 'c6'], [W, 'd1', 'h5'], [K, 'g8', 'f6'], [W, 'h5', 'f7']];
  for (const P of [A, B]) logs.push('DBG ' + await P.ev('JSON.stringify({busy: __s3d.S.busy, over: __s3d.S.over, mode: __s3d.S.mode, turn: __s3d.S.chess.turn(), you: __s3d.S.online.room.you, st: __s3d.S.online.room.status})'));
  for (const [p, a, b] of seq) { for (let i = 0; i < 40 && await p.ev('__s3d.S.busy || !(__s3d.S.chess.turn() === __s3d.S.online.room.you)'); i++) await sleep(300); const r1 = await p.ev(`__s3d.scene.onTap('${a}')`); await sleep(200); const r2 = await p.ev(`JSON.stringify([__s3d.S.selected, __s3d.scene.onTap('${b}'), __s3d.S.chess.history().length])`); logs.push('TAP ' + a + b + ' ' + r1 + ' ' + r2); await sleep(2600); }
  await K.ev(`0`); await sleep(500);
  await W.snap('w_after_mate'); await K.snap('k_after_mate');
  await sleep(2500); await W.snap('w_result'); await K.snap('k_result');
  logs.push('HIST A ' + await A.ev('__s3d.S.chess.history().join(" ")'));
  logs.push('HIST B ' + await B.ev('__s3d.S.chess.history().join(" ")'));
  logs.push('OVER A ' + await A.ev('JSON.stringify([__s3d.S.over, __s3d.S.online.room.result, __s3d.S.online.room.reason])'));
  logs.push('OVER B ' + await B.ev('JSON.stringify([__s3d.S.over, __s3d.S.online.room.result, __s3d.S.online.room.reason])'));
  // emoji
  await K.ev(`__s3d.S.online.ws.send({t:'emoji', e:'👏'})`); await sleep(400); await W.snap('emoji');
  // revansh
  await A.ev(`document.querySelector('#oRematch').click()`); await B.ev(`document.querySelector('#oRematch').click()`); await sleep(5000);
  logs.push(`REMATCH A=${await A.ev('__s3d.S.online.room.you')} status=${await A.ev('__s3d.S.online.room.status')} moves=${await A.ev('__s3d.S.chess.history().length')}`);
  await A.snap('rematch');
} catch (e) { logs.push('DRIVER ERROR ' + e.stack); }
writeFileSync(join(OUT, 'log.txt'), logs.join('\n'));
console.log(logs.join('\n'));
A && A.kill(); B && B.kill();
process.exit(0);
