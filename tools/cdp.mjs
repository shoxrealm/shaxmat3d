// Minimal Chrome DevTools Protocol test driver (no deps; Node 22+ global WebSocket).
// node tools/cdp.mjs <url> <outDir> [scenario]
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [url, outDir, scenario = 'basic', w = '420', h = '860'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9300 + Math.floor(Math.random() * 500);
const prof = join(process.env.TEMP, 'cdp_prof_' + port);
const ch = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--no-first-run',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pending = new Map(); const logs = [];
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); break; }
    } catch (e) { /* retry */ }
    await sleep(200);
  }
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled') logs.push(`[${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Runtime.exceptionThrown') logs.push('[EXCEPTION] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Log.entryAdded') logs.push(`[log ${m.params.entry.level}] ${m.params.entry.text} ${m.params.entry.url || ''}`);
  };
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value ?? r.result?.exceptionDetails?.exception?.description; };
let shot = 0;
async function snap(name) {
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  writeFileSync(join(outDir, `${String(++shot).padStart(2, '0')}_${name}.jpg`), Buffer.from(r.result.data, 'base64'));
}
async function tapSquare(sq) { // ekran koordinatasini sahnadan hisoblaymiz
  const p = await ev(`(() => { const {scene} = window.__s3d; const T = scene.camera; const f = '${sq}'.charCodeAt(0)-97, r = +'${sq}'[1]-1;
    const v = new (T.position.constructor)(f-3.5, 0.3, 3.5-r).project(T); const el = scene.renderer.domElement.getBoundingClientRect();
    return [(v.x+1)/2*el.width + el.left, (1-v.y)/2*el.height + el.top]; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p[0], y: p[1], button: 'left', clickCount: 1 });
  await sleep(250);
}

try {
  await connect();
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 600 });
  await send('Page.navigate', { url });
  await sleep(9000);
  await snap('home');
  if (scenario === 'captures') {
    await ev(`document.querySelector('#home').classList.add('hidden'); __s3d.scene.setIdle(false); __s3d.scene.setInsets(40, 40); __s3d.scene.setOrientation('w', false)`);
    const cases = [['k7/8/8/3p4/4P3/8/8/7K w - - 0 1', 'exd5'], ['k7/8/8/3p4/8/4N3/8/7K w - - 0 1', 'Nxd5'], ['k7/8/8/3p4/8/8/6B1/7K w - - 0 1', 'Bxd5'],
      ['k7/8/8/3p4/8/8/8/3R3K w - - 0 1', 'Rxd5'], ['k7/8/8/3p4/8/8/8/3Q3K w - - 0 1', 'Qxd5'], ['k7/8/8/8/8/8/3p4/4K3 w - - 0 1', 'Kxd2']];
    for (const [fen, san] of cases) for (let rep = 0; rep < 2; rep++) {
      await ev(`(async () => { const { Chess } = await import('./js/vendor/chess.js'); const c = new Chess('${fen}'); await __s3d.scene.setBoard(c.board()); window.__mv = c.move('${san}'); })()`);
      await sleep(600);
      ev(`__s3d.scene.animateMove(window.__mv)`);
      await sleep(san[0] === 'N' ? 900 : 750); await snap(`${san}_${rep}_a_` + await ev('__s3d.scene.lastStyle'));
      await sleep(350); await snap(`${san}_${rep}_b`);
      await sleep(1500);
    }
  } else if (scenario === 'puzzle') {
    // kunlik masala: notoʻgʻri yurish, keyin toʻgʻri yechim, natija, natijalar/yutuqlar oynasi
    await ev(`document.querySelector('#btnPuzzle').click()`); await sleep(700); await snap('puzzles');
    await ev(`document.querySelector('#pzToday').click()`); await sleep(3500); await snap('puzzle_start');
    const sol = await ev(`__s3d.S.task.sol`);
    const wrong = await ev(`(() => { const s = __s3d.S; const m = s.chess.moves({ verbose: true }).find((x) => !x.promotion && x.from + x.to !== s.task.sol[0].slice(0, 4)); return m.from + m.to; })()`);
    await tapSquare(wrong.slice(0, 2)); await tapSquare(wrong.slice(2, 4)); await sleep(500); await snap('wrong'); await sleep(1500);
    logs.push('STATE after wrong step=' + await ev('__s3d.S.task.step') + ' fen=' + await ev('__s3d.S.chess.fen()'));
    await tapSquare(sol[0].slice(0, 2)); await tapSquare(sol[0].slice(2, 4)); await sleep(2600); await snap('after_reply');
    const mate = await ev(`(() => { const c = __s3d.S.chess; const m = c.moves({ verbose: true }).find((x) => { c.move(x); const k = c.isCheckmate(); c.undo(); return k; }); return m ? m.from + m.to : null; })()`);
    logs.push('STATE step=' + await ev('__s3d.S.task.step') + ' mate=' + mate);
    await tapSquare(mate.slice(0, 2)); await tapSquare(mate.slice(2, 4)); await sleep(3500); await snap('solved');
    logs.push('STATE puzzle stats ' + JSON.stringify(await ev('__s3d.S.stats.puzzle')) + ' ach ' + JSON.stringify(await ev('Object.keys(__s3d.S.stats.ach||{})')));
    await ev(`document.querySelector('#pHome').click()`); await sleep(1500); await snap('home_after');
    await ev(`document.querySelector('#btnStats').click()`); await sleep(600); await snap('stats');
  } else if (scenario === 'p2') {
    // darslar: rokirovka darsi
    await ev(`document.querySelector('#btnLessons').click()`); await sleep(600); await snap('lessons');
    await ev(`document.querySelector('[data-l="6"]').click()`); await sleep(500); await snap('lesson_intro');
    await ev(`document.querySelector('#lGo').click()`); await sleep(3500);
    await tapSquare('e1'); await tapSquare('g1'); await sleep(2500); await snap('lesson_done');
    logs.push('STATE lessons ' + JSON.stringify(await ev('__s3d.S.stats.lessons')));
    await ev(`document.querySelector('#lHome').click()`); await sleep(1200);
    // bir telefonda: tez mot, keyin tahlil
    await ev(`document.querySelector('#btnFriend').click()`); await sleep(3500);
    for (const [a, b] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]) { await tapSquare(a); await tapSquare(b); await sleep(1500); }
    await sleep(3000); await snap('result');
    await ev(`document.querySelector('#rAn').click()`); await sleep(4000); await snap('analysis');
    await ev(`document.querySelector('.an-row') && document.querySelector('.an-row').click()`); await sleep(1500); await snap('analysis_row');
    logs.push('STATE analysis ' + JSON.stringify(await ev('__s3d.S.analysis && __s3d.S.analysis.items.map(i => i.san + ":" + i.kind + ":" + i.bsan)')));
    const img = await ev(`__s3d.resultCard('Qora yutdi 0–1', 'Bir telefonda · Mat · 2 yurish')`);
    writeFileSync(join(outDir, 'card.jpg'), Buffer.from(img.split(',')[1], 'base64'));
  } else if (scenario === 'tap') {
    await ev(`document.querySelector('#btnFriend').click()`); await sleep(8000);
    logs.push('BUSY ' + await ev('__s3d.S.busy') + ' fps-check');
    const t0 = Date.now(); await ev('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'); logs.push('2 frames ms ' + (Date.now()-t0));
    await tapSquare('e2'); await sleep(1500); logs.push('STATE sel=' + await ev('__s3d.S.selected'));
  } else if (scenario !== 'home') {
    // doʻst bilan rejim: Scholar mate, oʻrtada olish, rokirovka emas
    await ev(`document.querySelector('#btnFriend').click()`); await sleep(3500); await snap('friend_start');
    for (const [a, b] of [['e2', 'e4'], ['e7', 'e5'], ['f1', 'c4'], ['b8', 'c6'], ['d1', 'h5'], ['g8', 'f6']]) {
      await tapSquare(a); await tapSquare(b); await sleep(1500);
    }
    await tapSquare('h5'); await sleep(300); await snap('selected_queen');
    await tapSquare('f7'); await sleep(900); await snap('capture_mid');
    await sleep(2600); await snap('mate');
    await sleep(1500); await snap('result');
    logs.push('STATE ' + JSON.stringify(await ev(`({over: __s3d.S.over, fen: __s3d.S.chess.fen(), hist: __s3d.S.chess.history().join(' ')})`)));
    // AI rejimi
    await ev(`document.querySelector('#rHome').click()`); await sleep(800);
    await ev(`document.querySelector('#btnAI').click()`); await sleep(500); await snap('levels');
    await ev(`document.querySelector('#colors [data-c=w]').click(); document.querySelector('#btnStartAI').click()`); await sleep(3500);
    await tapSquare('e2'); await tapSquare('e4'); await sleep(3500); await snap('ai_replied');
    await tapSquare('d2'); await tapSquare('d4'); await sleep(3500);
    await ev(`document.querySelector('#tHint').click()`); await sleep(2500); await snap('hint');
    logs.push('AI ' + JSON.stringify(await ev(`__s3d.S.chess.history().join(' ')`)));
    // doʻkon va mavzular
    await ev(`document.querySelector('#tMenu').click()`); await sleep(400);
    await ev(`document.querySelector('#mShop').click()`); await sleep(600); await snap('shop');
    for (const th of ['marmar', 'oltin', 'neon', 'kristall', 'samarqand']) {
      await ev(`document.querySelector('#modal').classList.add('hidden'); __s3d.scene.applyTheme('${th}')`); await sleep(1800); await snap('theme_' + th);
    }
    await ev(`__s3d.scene.applyTheme('klassik')`);
  }
} catch (e) { logs.push('DRIVER ERROR ' + e.stack); }
writeFileSync(join(outDir, 'console.txt'), logs.join('\n'));
console.log(logs.filter((l) => /error|exception|fail|STATE|AI /i.test(l)).slice(0, 40).join('\n') || 'no errors');
try { ws.close(); } catch (e) { /* */ }
ch.kill();
process.exit(0);
