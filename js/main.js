// Shaxmat 3D — ilova oqimi, UI va oʻyin mantiqi.
import { Chess } from './vendor/chess.js';
import { Scene3D } from './scene.js';
import { LEVELS, THEMES, EFFECTS, ITEMS, FREE_UNDOS, FREE_HINTS, BOT_USERNAME } from './config.js';
import * as NET from './net.js';
import { INVOICES } from './invoices.js';
import * as TG from './telegram.js';
import { play, setSound } from './sound.js';

const $ = (s) => document.querySelector(s);
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const GLYPH = { w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' }, b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' } };
const REASON = { checkmate: 'Mat', stalemate: 'Pat', threefold: 'Uch marta takrorlanish', fifty: '50 yurish qoidasi',
  insufficient: 'Mat qilish uchun dona yetarli emas', resign: 'Taslim boʻlindi', agreed: 'Kelishuv boʻyicha durang' };

const S = {
  chess: new Chess(), mode: null, level: 1, player: 'w', busy: false, selected: null, targets: [], over: false,
  undos: 0, hints: 0, owned: new Set(), settings: null, stats: null, aiReq: 0,
};
const DEFAULTS = { sound: true, haptics: true, quality: /android|iphone|ipad/i.test(navigator.userAgent) ? 'mid' : 'high',
  dots: true, view2D: false, autoRotate: true, coords: true, theme: 'klassik', effect: 'shatter' };

let scene, worker;

// ───────────── yordamchilar ─────────────
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}
const isPro = () => S.owned.has('pro') || S.owned.has('bundle_all');
const owns = (item) => item.free || S.owned.has(item.id) || S.owned.has('bundle_all');
const themeItem = (key) => ITEMS.find((i) => i.type === 'theme' && i.key === key) || { id: 'free', free: true };
const effectItem = (key) => ITEMS.find((i) => i.type === 'effect' && i.key === key) || { id: 'free', free: true };
function saveSettings() { TG.storeSet('settings', S.settings); }
function saveOwned() { TG.storeSet('owned', [...S.owned]); }

function aiSearch(fen, opts) {
  return new Promise((resolve) => {
    const id = ++S.aiReq;
    const h = (e) => { if (e.data.id === id) { worker.removeEventListener('message', h); resolve(e.data); } };
    worker.addEventListener('message', h);
    worker.postMessage({ id, fen, opts });
  });
}

function kingSquare(color) {
  const b = S.chess.board();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const p = b[r][f];
    if (p && p.type === 'k' && p.color === color) return String.fromCharCode(97 + f) + (8 - r);
  }
  return null;
}

// ───────────── saqlash ─────────────
function saveGame() {
  if (S.mode === 'online') return;
  if (!S.mode || S.over) { TG.storeSet('game', null); return; }
  const moves = S.chess.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion || ''));
  TG.storeSet('game', { mode: S.mode, level: S.level, player: S.player, moves, undos: S.undos, hints: S.hints });
}

function restoreMoves(moves) {
  S.chess.reset();
  for (const u of moves) {
    try { S.chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { break; }
  }
}

// ───────────── HUD ─────────────
function updateHUD() {
  const hist = S.chess.history({ verbose: true });
  const capturedBy = { w: [], b: [] };
  for (const m of hist) if (m.captured) capturedBy[m.color].push(m.captured);
  const mat = (c) => capturedBy[c].reduce((s, p) => s + VAL[p], 0);
  const bottomColor = scene.orientation;
  const topColor = bottomColor === 'w' ? 'b' : 'w';
  const room = S.mode === 'online' && S.online && S.online.room;
  const name = (c) => {
    if (S.mode === 'ai') return c === S.player ? `🙂 ${TG.userName()}` : `🤖 Kompyuter · ${LEVELS[S.level].name}`;
    if (room) {
      const p = c === 'w' ? room.white : room.black;
      if (!p) return 'Raqib kutilmoqda…';
      return `${p.online === false ? '⚪️' : '🟢'} ${p.name} · ${p.rating}`;
    }
    return c === 'w' ? '⚪ Oq' : '⚫ Qora';
  };
  for (const [bar, c] of [[$('#barTop'), topColor], [$('#barBottom'), bottomColor]]) {
    bar.querySelector('.pname').textContent = name(c);
    bar.querySelector('.ava').textContent = S.mode === 'ai' && c !== S.player ? '🤖' : c === 'w' ? '♔' : '♚';
    bar.dataset.color = c;
    const opp = c === 'w' ? 'b' : 'w';
    bar.querySelector('.caps').textContent = capturedBy[c].sort((a, b) => VAL[b] - VAL[a]).map((p) => GLYPH[opp][p]).join('');
    const d = mat(c) - mat(opp);
    bar.querySelector('.adv').textContent = d > 0 ? `+${d}` : '';
    bar.classList.toggle('turn', !S.over && S.chess.turn() === c);
  }
  // yurishlar roʻyxati
  const box = $('#moves'); box.innerHTML = '';
  const san = S.chess.history();
  for (let i = 0; i < san.length; i += 2) {
    const el = document.createElement('div');
    el.className = 'mv' + (i >= san.length - 2 ? ' last' : '');
    el.innerHTML = `<b>${i / 2 + 1}.</b>${san[i]}${san[i + 1] ? ' ' + san[i + 1] : ''}`;
    box.appendChild(el);
  }
  box.scrollLeft = box.scrollWidth;
  const pro = isPro();
  const on = S.mode === 'online';
  $('#tUndo em').textContent = on ? '' : pro ? '∞' : String(Math.max(0, FREE_UNDOS - S.undos));
  $('#tHint em').textContent = on ? '' : pro ? '∞' : String(Math.max(0, FREE_HINTS - S.hints));
  $('#tUndo i').textContent = on ? '😀' : '↶'; $('#tUndo span').textContent = on ? 'Emoji' : 'Orqaga';
  $('#tHint i').textContent = on ? '🤝' : '💡'; $('#tHint span').textContent = on ? 'Durang' : 'Maslahat';
  $('#tResign span').textContent = S.mode === 'friend' ? 'Durang' : 'Taslim';
  $('#tResign i').textContent = S.mode === 'friend' ? '🤝' : '🏳️';
  drawClocks();
}

// ───────────── onlayn: soatlar ─────────────
function fmtClock(ms) {
  ms = Math.max(0, ms);
  const s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
  return ms < 10000 ? (ms / 1000).toFixed(1) : `${m}:${String(s % 60).padStart(2, '0')}`;
}
function clockLeft(c) {
  const r = S.online && S.online.room;
  if (!r || !r.tc || !r.tc.base) return null;
  let ms = r.clocks[c];
  if (r.status === 'playing' && r.turnStartedAt && S.chess.turn() === c) ms -= Date.now() + S.online.offset - r.turnStartedAt;
  return ms;
}
function drawClocks() {
  for (const bar of [$('#barTop'), $('#barBottom')]) {
    let el = bar.querySelector('.clk');
    const ms = S.mode === 'online' ? clockLeft(bar.dataset.color) : null;
    if (ms === null) { if (el) el.remove(); continue; }
    if (!el) { el = document.createElement('div'); el.className = 'clk'; bar.appendChild(el); }
    el.textContent = fmtClock(ms);
    el.classList.toggle('low', ms < 20000);
    el.classList.toggle('run', S.online.room.status === 'playing' && S.chess.turn() === bar.dataset.color && !!S.online.room.turnStartedAt);
  }
}
setInterval(() => { if (S.mode === 'online') drawClocks(); }, 200);

function setThinking(on) {
  const aiColor = S.player === 'w' ? 'b' : 'w';
  const bar = scene.orientation === aiColor ? $('#barBottom') : $('#barTop');
  document.querySelectorAll('.think').forEach((t) => t.classList.add('hidden'));
  if (on) bar.querySelector('.think').classList.remove('hidden');
}

function flashStatus(text, ms = 1100) {
  const s = $('#status'); s.textContent = text; s.classList.remove('hidden');
  s.style.animation = 'none'; void s.offsetWidth; s.style.animation = '';
  clearTimeout(flashStatus._t); flashStatus._t = setTimeout(() => s.classList.add('hidden'), ms);
}

// ───────────── oʻyin oqimi ─────────────
async function startGame(mode, level = 1, color = 'w', restore = null) {
  closeModal(); $('#levelSheet').classList.add('hidden');
  S.mode = mode; S.level = level; S.player = color; S.over = false; S.busy = true;
  S.undos = restore ? restore.undos || 0 : 0; S.hints = restore ? restore.hints || 0 : 0;
  S.selected = null; S.aiReq++;
  if (restore) restoreMoves(restore.moves); else S.chess.reset();
  $('#home').classList.add('hidden'); $('#hud').classList.remove('hidden');
  TG.setBack(() => goHome());
  scene.setInsets(78, 192);
  scene.setIdle(false); scene.clearSelection(); scene.clearHint(); scene.setCheck(null); scene.setLastMove(null);
  const orient = mode === 'ai' ? color : (S.settings.autoRotate ? S.chess.turn() : 'w');
  scene.setOrientation(orient);
  updateHUD();
  play('castle');
  await scene.setBoard(S.chess.board(), true);
  afterPosition(true);
  S.busy = false;
  saveGame();
  maybeAI();
}

function afterPosition(quiet = false) {
  const last = S.chess.history({ verbose: true }).slice(-1)[0];
  scene.setLastMove(last ? last.from : null, last ? last.to : null);
  scene.setCheck(S.chess.inCheck() ? kingSquare(S.chess.turn()) : null);
  updateHUD();
  if (!quiet && S.chess.inCheck() && !S.chess.isCheckmate()) { flashStatus('Shoh! ⚠️'); play('check'); TG.haptic('warning'); }
}

function isHumanTurn() {
  if (S.mode === 'online') { const r = S.online && S.online.room; return !!r && r.status === 'playing' && r.you === S.chess.turn(); }
  return S.mode === 'friend' || S.chess.turn() === S.player;
}

function onTap(sq, dropped = false) {
  if (S.busy || S.over || !S.mode || !isHumanTurn()) return false;
  const piece = S.chess.get(sq);
  if (S.selected && S.targets.some((t) => t.to === sq)) { humanMove(S.selected, sq, dropped); return true; }
  if (piece && piece.color === S.chess.turn()) {
    if (S.selected === sq && !dropped) { S.selected = null; scene.clearSelection(); return false; }
    S.selected = sq;
    const ms = S.chess.moves({ square: sq, verbose: true });
    const seen = new Map();
    for (const m of ms) seen.set(m.to, { to: m.to, capture: !!m.captured });
    S.targets = [...seen.values()];
    scene.showSelection(sq, S.targets, S.settings.dots);
    play('click'); TG.haptic('select');
    return false;
  }
  S.selected = null; scene.clearSelection();
  return false;
}

function canDrag(sq) {
  if (S.busy || S.over || !S.mode || !isHumanTurn()) return false;
  const p = S.chess.get(sq);
  return !!p && p.color === S.chess.turn();
}

async function humanMove(from, to, dropped) {
  const cands = S.chess.moves({ square: from, verbose: true }).filter((m) => m.to === to);
  let promotion;
  if (cands.some((m) => m.promotion)) {
    S.busy = true;
    promotion = await choosePromotion(S.chess.turn());
    S.busy = false;
  }
  await playMove({ from, to, promotion }, dropped, true);
  if (!S.over && S.mode === 'friend' && S.settings.autoRotate) await scene.setOrientation(S.chess.turn());
  if (S.mode === 'friend') updateHUD();
  maybeAI();
}

async function playMove(m, dropped = false, local = false) {
  S.busy = true;
  S.selected = null; scene.clearSelection(); scene.clearHint();
  let mv;
  try { mv = S.chess.move(m); } catch (e) { S.busy = false; return; }
  if (local && S.mode === 'online' && S.online) {
    const ply = S.chess.history().length - 1;
    S.online.ws.send({ t: 'move', uci: mv.from + mv.to + (mv.promotion || ''), ply });
    const r = S.online.room;
    if (r && r.status === 'playing' && r.turnStartedAt) { // soatni darhol raqibga oʻtkazamiz (server tasdiqlaguncha)
      const now = Date.now() + S.online.offset;
      r.clocks[mv.color] -= now - r.turnStartedAt; r.turnStartedAt = now;
    } else if (r && r.status === 'playing') r.turnStartedAt = Date.now() + S.online.offset;
    r && r.moves.push(mv.from + mv.to + (mv.promotion || ''));
    S.online.drawOffer = null;
  }
  const kind = mv.flags.includes('k') || mv.flags.includes('q') ? 'castle' : mv.captured ? 'capture' : 'move';
  if (kind === 'capture' && scene.effect === 'chaqmoq') setTimeout(() => play('zap'), 250);
  if (kind === 'capture' && scene.effect === 'olov') setTimeout(() => play('fire'), 250);
  await scene.animateMove(mv, { dropped });
  play(mv.promotion ? 'promote' : kind);
  TG.haptic(kind === 'capture' ? 'medium' : 'light');
  afterPosition();
  saveGame();
  S.busy = false;
  await checkGameOver();
}

async function maybeAI() {
  if (S.mode !== 'ai' || S.over || S.chess.turn() === S.player) return;
  S.busy = true;
  setThinking(true);
  const req = S.aiReq + 1;
  const t0 = performance.now();
  const r = await aiSearch(S.chess.fen(), LEVELS[S.level].opts);
  if (req !== S.aiReq || S.mode !== 'ai' || S.over) { setThinking(false); return; } // oʻyin almashgan
  const spent = performance.now() - t0;
  if (spent < 450) await new Promise((res) => setTimeout(res, 450 - spent));
  setThinking(false);
  if (!r.ok || !r.move) { S.busy = false; return; }
  await playMove({ from: r.move.slice(0, 2), to: r.move.slice(2, 4), promotion: r.move[4] });
}

async function checkGameOver(forced = null) {
  if (S.mode === 'online') return; // onlayn oʻyin natijasini server hal qiladi
  const c = S.chess;
  let result = null, reason = null, winner = null;
  if (forced) ({ result, reason, winner } = forced);
  else if (c.isCheckmate()) { reason = 'checkmate'; winner = c.turn() === 'w' ? 'b' : 'w'; }
  else if (c.isStalemate()) reason = 'stalemate';
  else if (c.isThreefoldRepetition()) reason = 'threefold';
  else if (c.isInsufficientMaterial()) reason = 'insufficient';
  else if (c.isDrawByFiftyMoves && c.isDrawByFiftyMoves()) reason = 'fifty';
  else if (c.isDraw()) reason = 'fifty';
  if (!reason) return;
  S.over = true; S.busy = true;
  updateHUD();
  TG.storeSet('game', null);
  let outcome = 'draw';
  if (winner) outcome = S.mode === 'ai' ? (winner === S.player ? 'win' : 'loss') : 'win';
  // statistika
  const key = S.mode === 'ai' ? 'l' + S.level : 'friend';
  const st = S.stats[key] || (S.stats[key] = { w: 0, l: 0, d: 0 });
  st[outcome === 'win' ? 'w' : outcome === 'loss' ? 'l' : 'd']++;
  TG.storeSet('stats', S.stats);
  if (reason === 'checkmate') {
    flashStatus('Mat! ♚', 1400);
    scene.checkmate(kingSquare(c.turn()), winner);
  } else if (winner) {
    scene.checkmate(kingSquare(winner === 'w' ? 'b' : 'w'), winner);
  } else {
    scene.drawEffect([kingSquare('w'), kingSquare('b')]);
  }
  play(outcome === 'win' ? 'win' : outcome === 'loss' ? 'lose' : 'draw');
  TG.haptic(outcome === 'loss' ? 'error' : 'success');
  await new Promise((r) => setTimeout(r, reason === 'checkmate' || winner ? 2000 : 1200));
  showResult(outcome, reason, winner);
  S.busy = false;
}

function showResult(outcome, reason, winner) {
  let big, title;
  if (S.mode === 'friend' && winner) { big = '🏆'; title = (winner === 'w' ? 'Oq' : 'Qora') + ' gʻalaba qozondi!'; }
  else if (outcome === 'win') { big = '🎉'; title = 'Gʻalaba!'; }
  else if (outcome === 'loss') { big = '😔'; title = 'Magʻlubiyat'; }
  else { big = '🤝'; title = 'Durang'; }
  const moves = Math.ceil(S.chess.history().length / 2);
  openModal(`<div class="result"><div class="big">${big}</div><h2>${title}</h2><p>${REASON[reason] || ''} · ${moves} yurish</p>
    ${S.mode === 'ai' && outcome === 'win' && S.level < 3 ? `<p>Keyingi daraja: <b>${LEVELS[S.level + 1].name}</b> — sinab koʻrasizmi?</p>` : ''}
    <button class="btn primary" id="rAgain">🔄 Yana oʻynash</button>
    ${S.mode === 'ai' && outcome === 'win' && S.level < 3 ? '<button class="btn" id="rNext">⬆️ Keyingi daraja</button>' : ''}
    <button class="btn" id="rShare">📤 Doʻstlarga ulashish</button>
    <button class="btn ghost" id="rHome">Bosh menyu</button></div>`);
  $('#rAgain').onclick = () => startGame(S.mode, S.level, S.mode === 'ai' ? (S.settings.lastColor === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : S.player) : 'w');
  const nx = $('#rNext'); if (nx) nx.onclick = () => startGame('ai', S.level + 1, S.player);
  $('#rShare').onclick = () => { if (!TG.shareGame('Shaxmat 3D — keling, bellashamiz! ♟')) toast('Ulashish faqat Telegram ichida'); };
  $('#rHome').onclick = () => goHome();
}

function goHome() {
  closeModal(); S.aiReq++;
  leaveOnline();
  S.busy = false; S.selected = null; scene.clearSelection(); scene.clearHint();
  const wasOnline = S.mode === 'online';
  if (!S.over && S.mode) saveGame();
  S.mode = null;
  if (wasOnline) { S.chess = new Chess(); scene.syncBoard(S.chess.board()); scene.setLastMove(null); scene.setCheck(null); }
  $('#hud').classList.add('hidden'); $('#home').classList.remove('hidden');
  $('#btnContinue').classList.toggle('hidden', !S.chess.history().length || S.over);
  TG.setBack(null);
  scene.setInsets(160, 330); scene.setOrientation('w');
  scene.setIdle(true);
}

// ───────────── asboblar ─────────────
async function doUndo() {
  if (S.mode === 'online') return openEmoji();
  if (S.busy || !S.mode || S.over) return;
  if (!S.chess.history().length) return toast('Hali yurish qilinmagan');
  if (!isPro() && S.undos >= FREE_UNDOS) return upsell('Bepul «Orqaga» tugadi (oʻyinda 3 ta).');
  S.busy = true;
  S.chess.undo();
  if (S.mode === 'ai' && S.chess.turn() !== S.player && S.chess.history().length) S.chess.undo();
  S.undos++;
  scene.clearSelection(); scene.clearHint();
  await scene.syncBoard(S.chess.board());
  afterPosition(true);
  if (S.mode === 'friend' && S.settings.autoRotate) await scene.setOrientation(S.chess.turn());
  saveGame(); play('move'); S.busy = false;
  maybeAI();
}

async function doHint() {
  if (S.mode === 'online') return offerDraw();
  if (S.busy || !S.mode || S.over || !isHumanTurn()) return;
  if (!isPro() && S.hints >= FREE_HINTS) return upsell('Bepul maslahat tugadi (oʻyinda 1 ta).');
  S.busy = true; toast('💡 Oʻylayapman…', 1200);
  const r = await aiSearch(S.chess.fen(), { timeMs: 1200 });
  S.busy = false;
  if (r.ok && r.move) { S.hints++; scene.showHint(r.move.slice(0, 2), r.move.slice(2, 4)); updateHUD(); saveGame(); play('promote'); }
}

function doResign() {
  if (S.mode === 'online') {
    if (S.over || !S.online.room || !S.online.room.you) return;
    openModal(`<h2>Taslim boʻlasizmi? 🏳️</h2><p class="muted" style="text-align:center">Oʻyin magʻlubiyat sifatida yoziladi.</p>
      <button class="btn primary" id="yes">Ha, taslim</button><button class="btn ghost" data-close>Davom etish</button>`);
    $('#yes').onclick = () => { closeModal(); S.online.ws.send({ t: 'resign' }); };
    return;
  }
  if (S.busy || !S.mode || S.over) return;
  if (S.mode === 'friend') {
    openModal(`<h2>Durang taklifi 🤝</h2><p class="muted" style="text-align:center">Ikkala oʻyinchi ham rozimi?</p>
      <button class="btn primary" id="yes">Ha, durang</button><button class="btn ghost" data-close>Yoʻq</button>`);
    $('#yes').onclick = () => { closeModal(); checkGameOver({ reason: 'agreed' }); };
  } else {
    openModal(`<h2>Taslim boʻlasizmi? 🏳️</h2><p class="muted" style="text-align:center">Oʻyin magʻlubiyat sifatida yoziladi.</p>
      <button class="btn primary" id="yes">Ha, taslim</button><button class="btn ghost" data-close>Davom etish</button>`);
    $('#yes').onclick = () => { closeModal(); checkGameOver({ reason: 'resign', winner: S.player === 'w' ? 'b' : 'w' }); };
  }
}

function upsell(text) {
  openModal(`<h2>🧠 PRO</h2><p class="muted" style="text-align:center">${text}<br>PRO bilan «Orqaga» va «Maslahat» cheksiz.</p>
    <button class="btn primary" id="upBuy">PRO olish · ${ITEMS.find((i) => i.id === 'pro').price} ⭐</button>
    <button class="btn" id="upShop">🎨 Doʻkonni ochish</button><button class="btn ghost" data-close>Yopish</button>`);
  $('#upBuy').onclick = () => buy(ITEMS.find((i) => i.id === 'pro'));
  $('#upShop').onclick = () => openShop();
}

// ───────────── onlayn oʻyin ─────────────
const TCS = [['60+0', '⚡ 1 daq'], ['180+0', '🔥 3 daq'], ['180+2', '3 + 2'], ['300+0', '⏱ 5 daq'], ['600+0', '🕰 10 daq']];
const tcText = (tc) => (!tc || !tc.base ? 'Vaqtsiz' : `${tc.base / 60} daq${tc.inc ? ' + ' + tc.inc + ' s' : ''}`);
const OREASON = { ...REASON, timeout: 'Vaqt tugadi', abandon: 'Oʻyinchi oʻyinni tashlab ketdi', aborted: 'Oʻyin bekor qilindi' };
const EMOJIS = ['👍', '😂', '😮', '😡', '🤝', '🔥', '👏', '😎'];

function needOnline() {
  if (NET.onlineAvailable()) return true;
  toast(NET.API ? 'Onlayn oʻyin faqat Telegram ichida ishlaydi' : 'Onlayn server tez orada ishga tushadi');
  return false;
}

function openOnline() {
  if (!needOnline()) return;
  const me = S.me;
  openModal(`<h2>🌐 Onlayn</h2>${me ? `<p class="muted" style="text-align:center">Reytingingiz: <b>${me.rating}</b> · ${me.games} oʻyin</p>` : ''}
    <p class="muted">⚡ Tasodifiy raqib (reytingli)</p>
    <div class="chips" id="tcQuick">${TCS.map(([v, l]) => `<button class="chip" data-tc="${v}">${l}</button>`).join('')}</div>
    <p class="muted">🔗 Doʻstni havola orqali chaqirish</p>
    <div class="chips" id="tcFriend">${[...TCS, ['0+0', '♾ Vaqtsiz']].map(([v, l]) => `<button class="chip ${v === '600+0' ? 'active' : ''}" data-tc="${v}">${l}</button>`).join('')}</div>
    <button class="btn primary" id="btnInvite">🔗 Taklif havolasini yaratish</button>
    <button class="btn" id="btnTop">🏆 Reyting jadvali</button><button class="btn ghost" data-close>Yopish</button>`);
  const c = $('#modalCard');
  c.querySelectorAll('#tcQuick .chip').forEach((b) => (b.onclick = () => startMatch(b.dataset.tc)));
  c.querySelectorAll('#tcFriend .chip').forEach((b) => (b.onclick = () => { c.querySelectorAll('#tcFriend .chip').forEach((x) => x.classList.toggle('active', x === b)); play('click'); }));
  $('#btnInvite').onclick = () => createRoom(c.querySelector('#tcFriend .chip.active').dataset.tc);
  $('#btnTop').onclick = () => openTop();
}

function startMatch(tc) {
  play('click');
  if (S.matchWs) S.matchWs.close();
  const t0 = Date.now();
  openModal(`<div class="result"><div class="big searching">🔎</div><h2>Raqib qidirilmoqda…</h2>
    <p>${tcText({ base: +tc.split('+')[0], inc: +tc.split('+')[1] })} · <span id="mmT">0</span> s</p>
    <button class="btn ghost" id="mmCancel">Bekor qilish</button></div>`);
  const tick = setInterval(() => { const el = $('#mmT'); if (el) el.textContent = Math.floor((Date.now() - t0) / 1000); else clearInterval(tick); }, 500);
  const cancel = () => { clearInterval(tick); if (S.matchWs) { S.matchWs.close(); S.matchWs = null; } };
  closeModal.onClose = cancel;
  $('#mmCancel').onclick = () => closeModal();
  S.matchWs = new NET.Socket(`/ws/match?tc=${encodeURIComponent(tc)}`, (m) => {
    if (m.t === 'matched') { closeModal.onClose = null; cancel(); play('promote'); TG.haptic('success'); joinRoom(m.room); }
    else if (m.t === 'error') { toast(m.msg || 'Xatolik'); cancel(); closeModal(); }
  });
}

async function createRoom(tc) {
  play('click');
  const [base, inc] = tc.split('+').map(Number);
  try {
    const r = await NET.api('/api/room', { tc: { base, inc }, color: 'r' });
    S.inviteLink = r.link;
    joinRoom(r.id);
  } catch (e) { toast('Xona yaratib boʻlmadi: ' + e.message); }
}

function leaveOnline() {
  if (S.matchWs) { S.matchWs.close(); S.matchWs = null; }
  if (S.online && S.online.ws) S.online.ws.close();
  S.online = null;
}

function joinRoom(id) {
  if (!needOnline()) return;
  closeModal(); leaveOnline();
  S.mode = 'online'; S.over = false; S.busy = true; S.selected = null;
  S.online = { id, room: null, offset: 0, firstState: true };
  $('#home').classList.add('hidden'); $('#hud').classList.remove('hidden');
  TG.setBack(() => goHome());
  scene.setInsets(78, 192); scene.setIdle(false); scene.clearSelection(); scene.clearHint();
  S.online.ws = new NET.Socket(`/ws/room/${id}`, onNetMsg, (st) => {
    if (st === 'reconnecting') toast('📡 Qayta ulanmoqda…', 1500);
  });
  updateHUD();
}

async function onNetMsg(m) {
  const O = S.online;
  if (!O) return;
  switch (m.t) {
    case 'state': return applyRoomState(m.room);
    case 'move': return onRemoteMove(m);
    case 'over': return onOnlineOver(m);
    case 'presence':
      if (O.room) { if (O.room.white) O.room.white.online = m.w; if (O.room.black) O.room.black.online = m.b; updateHUD(); }
      return;
    case 'draw_offer':
      if (m.by !== O.room.you && O.room.you) {
        play('check');
        openModal(`<h2>🤝 Durang taklifi</h2><p class="muted" style="text-align:center">Raqibingiz durang taklif qilyapti.</p>
          <button class="btn primary" id="dYes">Qabul qilish</button><button class="btn" id="dNo">Rad etish</button>`);
        $('#dYes').onclick = () => { closeModal(); O.ws.send({ t: 'draw_accept' }); };
        $('#dNo').onclick = () => { closeModal(); O.ws.send({ t: 'draw_decline' }); };
      }
      return;
    case 'draw_declined': if (m.by !== O.room.you) toast('Raqib durangni rad etdi'); return;
    case 'rematch_offer':
      if (m.by !== O.room.you) { toast('🔄 Raqib revansh taklif qilyapti!', 3000); const b = $('#oRematch'); if (b) b.textContent = '🔄 Revanshni qabul qilish'; }
      return;
    case 'emoji': return floatEmoji(m.by, m.e);
    case 'error': toast(m.msg || 'Xatolik'); return;
    default: return;
  }
}

async function applyRoomState(room) {
  const O = S.online;
  const prev = O.room;
  O.room = room; O.offset = room.now - Date.now();
  const c = new Chess(room.startFen || undefined);
  for (const u of room.moves) { try { c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); } catch (e) { break; } }
  const newGame = !prev || (prev.status === 'over' || prev.status === 'aborted') && room.status === 'playing' && room.moves.length === 0;
  const same = c.fen() === S.chess.fen() && !newGame;
  S.chess = c;
  S.player = room.you || 'w';
  S.over = room.status === 'over' || room.status === 'aborted';
  if (O.firstState || newGame) {
    O.firstState = false;
    closeModal();
    scene.setOrientation(S.player);
    await scene.setBoard(c.board(), true);
    if (newGame && prev) { play('castle'); flashStatus('Yangi oʻyin! ♟', 1200); }
  } else if (!same) {
    await scene.syncBoard(c.board());
  }
  afterPosition(true);
  S.busy = false;
  if (room.status === 'waiting') showWaiting(room);
  else if (!S.over && !$('#modal').classList.contains('hidden') && $('#modalCard').dataset.kind === 'waiting') { closeModal(); play('promote'); flashStatus('Oʻyin boshlandi!', 1200); TG.haptic('success'); }
  if (!room.you && room.status !== 'waiting') toast('👀 Siz tomoshabinsiz', 2500);
  updateHUD();
}

function showWaiting(room) {
  const link = S.inviteLink || `https://t.me/${BOT_USERNAME}/play?startapp=r_${room.id}`;
  openModal(`<div class="result"><div class="big searching">⏳</div><h2>Doʻstingiz kutilmoqda…</h2>
    <p>${tcText(room.tc)} · Havolani doʻstingizga yuboring</p>
    <button class="btn primary" id="wShare">📤 Telegramda yuborish</button>
    <button class="btn" id="wCopy">🔗 Havolani nusxalash</button>
    <button class="btn ghost" id="wLeave">Bekor qilish</button></div>`);
  $('#modalCard').dataset.kind = 'waiting';
  $('#wShare').onclick = () => {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.switchInlineQuery) { try { tg.switchInlineQuery('r_' + room.id, ['users', 'groups']); return; } catch (e) { /* pastga */ } }
    if (tg && tg.openTelegramLink) tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent('♟ Keling, Shaxmat 3D da bellashamiz!'));
  };
  $('#wCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(link); toast('✅ Havola nusxalandi'); } catch (e) { toast(link, 5000); }
  };
  $('#wLeave').onclick = () => goHome();
}

async function onRemoteMove(m) {
  const O = S.online, r = O.room;
  if (!r) return;
  r.clocks = m.clocks; r.turnStartedAt = m.now; O.offset = m.now - Date.now();
  if (r.status === 'waiting') r.status = 'playing';
  const have = S.chess.history().length;
  if (m.ply < have) { drawClocks(); return; } // oʻz yurishimiz tasdiqlandi
  if (m.ply > have) { O.ws.close(); joinRoom(O.id); return; } // sinxron emas — qayta ulanamiz
  while (S.busy) await new Promise((res) => setTimeout(res, 50));
  r.moves.push(m.uci);
  await playMove({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
  updateHUD();
}

async function onOnlineOver(m) {
  const O = S.online, r = O.room;
  if (!r || S.over && r.result) return;
  r.status = m.reason === 'aborted' ? 'aborted' : 'over'; r.result = m.result; r.reason = m.reason; r.ratingDelta = m.ratingDelta;
  S.over = true;
  while (S.busy) await new Promise((res) => setTimeout(res, 50));
  updateHUD();
  const winner = m.result === '1-0' ? 'w' : m.result === '0-1' ? 'b' : null;
  const you = r.you;
  const outcome = !you ? 'watch' : !winner ? 'draw' : winner === you ? 'win' : 'loss';
  if (m.reason === 'checkmate') { flashStatus('Mat! ♚', 1400); scene.checkmate(kingSquare(S.chess.turn()), winner); }
  else if (winner) scene.checkmate(kingSquare(winner === 'w' ? 'b' : 'w'), winner);
  else if (m.reason !== 'aborted') scene.drawEffect([kingSquare('w'), kingSquare('b')]);
  play(outcome === 'win' ? 'win' : outcome === 'loss' ? 'lose' : 'draw');
  TG.haptic(outcome === 'loss' ? 'error' : 'success');
  if (S.me && you && m.ratingDelta && m.ratingDelta[you] != null) S.me.rating += m.ratingDelta[you];
  await new Promise((res) => setTimeout(res, winner ? 1800 : 900));
  const d = you && m.ratingDelta ? m.ratingDelta[you] : null;
  const big = m.reason === 'aborted' ? '🚫' : outcome === 'win' ? '🎉' : outcome === 'loss' ? '😔' : outcome === 'draw' ? '🤝' : '🏁';
  const title = m.reason === 'aborted' ? 'Bekor qilindi' : outcome === 'win' ? 'Gʻalaba!' : outcome === 'loss' ? 'Magʻlubiyat' : outcome === 'draw' ? 'Durang' : (winner === 'w' ? 'Oq' : winner === 'b' ? 'Qora' : 'Durang') + (winner ? ' yutdi' : '');
  openModal(`<div class="result"><div class="big">${big}</div><h2>${title}</h2><p>${OREASON[m.reason] || ''}</p>
    ${d != null ? `<p class="delta ${d >= 0 ? 'up' : 'down'}">Reyting: ${d >= 0 ? '+' : ''}${d}${S.me ? ' → ' + S.me.rating : ''}</p>` : ''}
    ${you ? '<button class="btn primary" id="oRematch">🔄 Revansh</button>' : ''}
    <button class="btn" id="oNew">🌐 Yangi raqib</button><button class="btn ghost" id="oHome">Bosh menyu</button></div>`);
  const rb = $('#oRematch');
  if (rb) rb.onclick = () => { O.ws.send({ t: 'rematch' }); rb.textContent = '⏳ Raqib javobini kutish…'; rb.disabled = true; };
  $('#oNew').onclick = () => { goHome(); openOnline(); };
  $('#oHome').onclick = () => goHome();
}

function offerDraw() {
  const r = S.online && S.online.room;
  if (!r || S.over || !r.you || r.status !== 'playing') return;
  if (S.online.drawOffer === 'sent') return toast('Taklif yuborilgan');
  S.online.drawOffer = 'sent';
  S.online.ws.send({ t: 'draw_offer' });
  toast('🤝 Durang taklifi yuborildi');
}

function openEmoji() {
  const r = S.online && S.online.room;
  if (!r || !r.you) return;
  openModal(`<h2>Emoji yuborish</h2><div class="promo" style="flex-wrap:wrap">${EMOJIS.map((e) => `<button data-e="${e}">${e}</button>`).join('')}</div>`);
  $('#modalCard').querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => { closeModal(); S.online.ws.send({ t: 'emoji', e: b.dataset.e }); }));
}

function floatEmoji(by, e) {
  const bar = $('#barTop').dataset.color === by ? $('#barTop') : $('#barBottom');
  const el = document.createElement('div');
  el.className = 'femoji'; el.textContent = e;
  const r = bar.getBoundingClientRect();
  el.style.left = (r.left + 40) + 'px'; el.style.top = (bar.classList.contains('top') ? r.bottom + 6 : r.top - 70) + 'px';
  document.body.appendChild(el);
  play('click'); TG.haptic('light');
  setTimeout(() => el.remove(), 2200);
}

async function openTop() {
  if (!needOnline()) return;
  openModal('<h2>🏆 Reyting</h2><p class="muted" style="text-align:center">Yuklanmoqda…</p>');
  try {
    const [top, me] = await Promise.all([NET.api('/api/top'), NET.api('/api/me')]);
    S.me = me;
    const medals = ['🥇', '🥈', '🥉'];
    openModal(`<h2>🏆 Reyting</h2><table class="stats"><tr><th>#</th><th>Oʻyinchi</th><th>Reyting</th><th>Oʻyin</th></tr>
      ${top.slice(0, 50).map((u, i) => `<tr><td>${medals[i] || i + 1}</td><td style="text-align:left">${escapeHtml(u.name)}</td><td>${u.rating}</td><td>${u.games}</td></tr>`).join('') || '<tr><td colspan="4">Hali reytingli oʻyinlar yoʻq</td></tr>'}</table>
      <p class="muted" style="text-align:center">Siz: <b>${me.rating}</b> · ${me.wins} gʻalaba · ${me.losses} magʻlubiyat · ${me.draws} durang</p>
      <button class="btn primary" id="tPlay">⚡ Reytingli oʻyin</button><button class="btn ghost" data-close>Yopish</button>`);
    $('#tPlay').onclick = () => openOnline();
  } catch (e) { toast('Reytingni yuklab boʻlmadi'); closeModal(); }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

// ───────────── modallar ─────────────
function openModal(html) {
  $('#modalCard').innerHTML = html;
  $('#modalCard').dataset.kind = '';
  $('#modal').classList.remove('hidden');
  $('#modal').querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => closeModal()));
  TG.setBack(() => closeModal());
}
function closeModal() {
  $('#modal').classList.add('hidden');
  if (closeModal.onClose) { const f = closeModal.onClose; closeModal.onClose = null; f(); }
  TG.setBack(S.mode ? () => goHome() : null);
}
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal' && !S.promoPending) closeModal(); });

function choosePromotion(color) {
  return new Promise((resolve) => {
    S.promoPending = true;
    openModal(`<h2>Dona tanlang</h2><div class="promo">${['q', 'r', 'b', 'n'].map((p) => `<button data-p="${p}">${GLYPH[color][p]}</button>`).join('')}</div>
      <p class="muted" style="text-align:center">Farzin · Rux · Fil · Ot</p>`);
    $('#modalCard').querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { S.promoPending = false; closeModal(); resolve(b.dataset.p); }));
  });
}

function openLevels() {
  const box = $('#levels'); box.innerHTML = '';
  const st = S.stats;
  LEVELS.forEach((l) => {
    const b = document.createElement('button');
    b.className = 'chip' + (l.id === (S.settings.lastLevel ?? 1) ? ' active' : '');
    const s = st['l' + l.id];
    b.innerHTML = `${l.emoji} ${l.name}<small>${s ? `${s.w} gʻalaba · ${s.l} magʻlubiyat` : 'yangi'}</small>`;
    b.onclick = () => { box.querySelectorAll('.chip').forEach((c) => c.classList.remove('active')); b.classList.add('active'); S.settings.lastLevel = l.id; play('click'); };
    box.appendChild(b);
  });
  $('#colors').querySelectorAll('.chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.c === (S.settings.lastColor || 'r'));
    c.onclick = () => { $('#colors').querySelectorAll('.chip').forEach((x) => x.classList.remove('active')); c.classList.add('active'); S.settings.lastColor = c.dataset.c; play('click'); };
  });
  $('#levelSheet').classList.remove('hidden');
  $('#levelSheet').querySelector('[data-close]').onclick = () => $('#levelSheet').classList.add('hidden');
  TG.setBack(() => { $('#levelSheet').classList.add('hidden'); TG.setBack(null); });
}

// ───────────── doʻkon ─────────────
function openShop() {
  const prevTheme = S.settings.theme, prevFx = S.settings.effect;
  closeModal.onClose = () => {
    // koʻrib chiqilgan, lekin sotib olinmagan mavzuni qaytaramiz
    if (!owns(themeItem(scene.themeKey))) scene.applyTheme(S.settings.theme);
    if (!owns(effectItem(scene.effect))) scene.setEffect(S.settings.effect);
  };
  const card = (it, sel, preview) => {
    const have = owns(it);
    return `<div class="item ${sel ? 'sel' : ''} ${it.type === 'bundle' || it.type === 'pro' ? 'wide' : ''}">
      ${have ? '' : '<span class="lock">🔒</span>'}<div class="em">${it.emoji}</div><div class="nm">${it.name}</div>
      <div class="pr">${have ? (sel ? '✅ Tanlangan' : 'Sizda bor') : it.price + ' ⭐'}</div>
      <div class="acts">${preview ? `<button data-prev="${it.id}">👁 Koʻrish</button>` : ''}
      ${have ? (preview && !sel ? `<button data-use="${it.id}">Tanlash</button>` : '') : `<button class="buy" data-buy="${it.id}">⭐ ${it.price}</button>`}</div></div>`;
  };
  const free = [{ id: 'free_theme', type: 'theme', key: 'klassik', name: THEMES.klassik.name, emoji: '🪵', free: true },
    { id: 'free_fx', type: 'effect', key: 'shatter', name: EFFECTS.shatter.name, emoji: '💥', free: true }];
  const all = [...free, ...ITEMS];
  const render = () => {
    const th = all.filter((i) => i.type === 'theme'), fx = all.filter((i) => i.type === 'effect');
    openModal(`<h2>🎨 Doʻkon</h2>
      <div class="shop-sec">Mavzular</div><div class="items">${th.map((i) => card(i, i.key === S.settings.theme, true)).join('')}</div>
      <div class="shop-sec">Urish effektlari</div><div class="items">${fx.map((i) => card(i, i.key === S.settings.effect, true)).join('')}</div>
      <div class="shop-sec">Imkoniyatlar</div><div class="items">${card(ITEMS.find((i) => i.id === 'pro'), false, false)}${card(ITEMS.find((i) => i.id === 'bundle_all'), false, false)}</div>
      <p class="muted" style="text-align:center">Toʻlov Telegram Stars orqali. Xarid darhol ochiladi.</p>
      <button class="btn ghost" data-close>Yopish</button>`);
    const card$ = $('#modalCard');
    card$.querySelectorAll('[data-prev]').forEach((b) => (b.onclick = () => {
      const it = all.find((i) => i.id === b.dataset.prev);
      if (it.type === 'theme') { scene.applyTheme(it.key); toast('👁 ' + it.name + ' — oldindan koʻrish'); }
      else { scene.setEffect(it.key); demoEffect(); toast('👁 ' + it.name + ' — urishda koʻrinadi'); }
      play('click');
    }));
    card$.querySelectorAll('[data-use]').forEach((b) => (b.onclick = () => { use(all.find((i) => i.id === b.dataset.use)); render(); }));
    card$.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => buy(all.find((i) => i.id === b.dataset.buy), render)));
  };
  render();
  void prevTheme; void prevFx;
}

function use(it) {
  if (it.type === 'theme') { S.settings.theme = it.key; scene.applyTheme(it.key); }
  if (it.type === 'effect') { S.settings.effect = it.key; scene.setEffect(it.key); }
  saveSettings(); play('promote'); TG.haptic('success');
}

async function buy(it, rerender) {
  const url = (S.invoices && S.invoices[it.id]) || INVOICES[it.id] || it.invoiceUrl;
  if (!TG.inTelegram) return toast('Xarid faqat Telegram ichida ishlaydi');
  if (!url) return toast('Bu mahsulot tez orada sotuvga chiqadi');
  const status = await TG.openInvoice(url);
  if (status === 'paid') {
    S.owned.add(it.id); saveOwned();
    toast('🎉 Rahmat! ' + it.name + ' ochildi');
    if (it.type === 'theme' || it.type === 'effect') use(it);
    updateHUD();
    if (rerender) rerender();
  } else if (status === 'failed') toast('Toʻlov amalga oshmadi');
}

async function demoEffect() {
  if (S.mode) return; // faqat bosh menyuda namoyish
  // namoyish: e4 dagi piyodani d5 dagi piyoda olishi
  const demo = new Chess('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2');
  await scene.setBoard(demo.board());
  const mv = demo.move('exd5');
  await scene.animateMove(mv);
  play('capture');
  setTimeout(() => { if (!S.mode) scene.syncBoard(new Chess().board()); }, 900);
}

// ───────────── sozlamalar va statistika ─────────────
function openSettings() {
  const sw = (k, label) => `<div class="set"><span>${label}</span><button class="switch ${S.settings[k] ? 'on' : ''}" data-k="${k}"></button></div>`;
  openModal(`<h2>⚙️ Sozlamalar</h2>
    ${sw('sound', '🔊 Ovoz')}${sw('haptics', '📳 Tebranish')}${sw('dots', '🎯 Mumkin yurishlarni koʻrsatish')}
    ${sw('view2D', '🗺 2D koʻrinish (tepadan)')}${sw('autoRotate', '🔄 Doʻst bilan: doskani aylantirish')}${sw('coords', '🔤 Koordinatalar')}
    <div class="set"><span>🎮 Grafika</span><div class="seg">${[['low', 'Past'], ['mid', 'Oʻrta'], ['high', 'Yuqori']].map(([v, l]) => `<button data-q="${v}" class="${S.settings.quality === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <button class="btn ghost" data-close>Yopish</button>`);
  const c = $('#modalCard');
  c.querySelectorAll('.switch').forEach((b) => (b.onclick = () => {
    const k = b.dataset.k; S.settings[k] = !S.settings[k]; b.classList.toggle('on', S.settings[k]); applySettings(k); saveSettings(); play('click');
  }));
  c.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
    S.settings.quality = b.dataset.q; c.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b)); applySettings('quality'); saveSettings();
  }));
}

function applySettings(k) {
  const s = S.settings;
  if (!k || k === 'sound') setSound(s.sound);
  if (!k || k === 'haptics') TG.setHaptics(s.haptics);
  if (!k || k === 'quality') scene.setQuality(s.quality);
  if (!k || k === 'view2D') scene.set2D(s.view2D);
  if (!k || k === 'coords') scene.labels.visible = s.coords;
}

function openStats() {
  const row = (label, s) => `<tr><td>${label}</td><td>${s ? s.w : 0}</td><td>${s ? s.l : 0}</td><td>${s ? s.d : 0}</td></tr>`;
  openModal(`<h2>📊 Statistika</h2><table class="stats"><tr><th>Rejim</th><th>Gʻ</th><th>M</th><th>D</th></tr>
    ${LEVELS.map((l) => row(`${l.emoji} ${l.name}`, S.stats['l' + l.id])).join('')}
    ${row('👥 Doʻst bilan', S.stats.friend ? { w: S.stats.friend.w, l: '–', d: S.stats.friend.d } : null)}</table>
    <p class="muted" style="text-align:center">Gʻ — gʻalaba, M — magʻlubiyat, D — durang</p><button class="btn ghost" data-close>Yopish</button>`);
}

// ───────────── ishga tushirish ─────────────
async function init() {
  TG.initTelegram();
  const [settings, owned, stats, game] = await Promise.all([TG.storeGet('settings'), TG.storeGet('owned'), TG.storeGet('stats'), TG.storeGet('game')]);
  S.settings = { ...DEFAULTS, ...(settings || {}) };
  S.owned = new Set([...(owned || []), ...TG.startParamOwned()]);
  saveOwned();
  S.stats = stats || {};
  if (!owns(themeItem(S.settings.theme))) S.settings.theme = 'klassik';
  if (!owns(effectItem(S.settings.effect))) S.settings.effect = 'shatter';

  worker = new Worker(new URL('./ai.worker.js', import.meta.url), { type: 'module' });
  scene = new Scene3D($('#stage'));
  scene.onTap = onTap; scene.canDrag = canDrag;
  scene.applyTheme(S.settings.theme); scene.setEffect(S.settings.effect);
  applySettings();
  scene.setInsets(160, 330);
  scene.setOrientation('w', false);
  scene.setIdle(true);
  await scene.setBoard(new Chess().board(), true);

  $('#loading').style.opacity = '0'; setTimeout(() => $('#loading').remove(), 500);
  $('#home').classList.remove('hidden');
  if (game && game.moves && game.mode) {
    S.saved = game;
    $('#btnContinue').classList.remove('hidden');
  }

  $('#btnContinue').onclick = () => {
    play('click');
    if (S.saved) { const g = S.saved; S.saved = null; startGame(g.mode, g.level, g.player, g); }
    else if (S.chess.history().length) startGame(S.lastMode || 'ai', S.level, S.player, { moves: S.chess.history({ verbose: true }).map((m) => m.from + m.to + (m.promotion || '')), undos: S.undos, hints: S.hints });
  };
  $('#btnAI').onclick = () => { play('click'); openLevels(); };
  $('#btnOnline').onclick = () => { play('click'); openOnline(); };
  // onlayn: profil, xaridlar va Stars havolalari serverdan; deep link (startapp=r_<id> | ?room=<id> | top)
  if (NET.onlineAvailable()) {
    NET.api('/api/me').then((me) => {
      S.me = me;
      for (const id of me.owned || []) S.owned.add(id);
      saveOwned();
    }).catch(() => {});
    NET.api('/api/invoices').then((inv) => { S.invoices = inv; }).catch(() => {});
    const tg = window.Telegram && window.Telegram.WebApp;
    const sp = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || '';
    const qroom = new URLSearchParams(location.search).get('room');
    if (sp.startsWith('r_') || qroom) joinRoom(qroom || sp.slice(2));
    else if (sp === 'top') openTop();
  }
  $('#btnStartAI').onclick = () => {
    const c = S.settings.lastColor || 'r';
    saveSettings();
    S.saved = null;
    startGame('ai', S.settings.lastLevel ?? 1, c === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : c);
  };
  $('#btnFriend').onclick = () => { play('click'); S.saved = null; startGame('friend', 0, 'w'); };
  $('#btnShop').onclick = () => { play('click'); openShop(); };
  $('#btnSettings').onclick = () => { play('click'); openSettings(); };
  $('#btnStats').onclick = () => { play('click'); openStats(); };
  $('#tUndo').onclick = doUndo;
  $('#tHint').onclick = doHint;
  $('#tResign').onclick = doResign;
  $('#tView').onclick = () => { S.settings.view2D = !S.settings.view2D; applySettings('view2D'); saveSettings(); play('click'); };
  $('#tMenu').onclick = () => {
    openModal(`<h2>Menyu</h2><button class="btn" id="mNew">🔄 Yangi oʻyin</button><button class="btn" id="mShop">🎨 Doʻkon</button>
      <button class="btn" id="mSet">⚙️ Sozlamalar</button><button class="btn" id="mHome">🏠 Bosh menyu</button><button class="btn ghost" data-close>Yopish</button>`);
    $('#mNew').onclick = () => startGame(S.mode, S.level, S.player);
    $('#mShop').onclick = () => openShop();
    $('#mSet').onclick = () => openSettings();
    $('#mHome').onclick = () => goHome();
  };
  // birinchi teginishda audio kontekstni uygʻotamiz
  window.addEventListener('pointerdown', () => play('none'), { once: true });
  window.__s3d = { S, scene }; // test uchun
}

init().catch((e) => {
  console.error(e);
  const l = $('#loading'); if (l) l.querySelector('p').textContent = 'Xatolik: ' + e.message;
});
