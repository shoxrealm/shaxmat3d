// Shaxmat 3D — ilova oqimi, UI va oʻyin mantiqi.
import { Chess } from './vendor/chess.js';
import { Scene3D } from './scene.js';
import { LEVELS, THEMES, EFFECTS, ITEMS, FREE_UNDOS, FREE_HINTS, BOT_USERNAME } from './config.js';
import * as NET from './net.js';
import { INVOICES } from './invoices.js';
import * as TG from './telegram.js';
import { play, setSound } from './sound.js';
import { icon, medallion, knightLogo, pieceIcon, piecePaths } from './icons.js';
import { puzzleFor, puzzleNumber, PRACTICE, isPractice } from './puzzles.js';
import { ACHIEVEMENTS, checkAchievements, markPlayedDay } from './achievements.js';
import { LESSONS } from './lessons.js';
import { LANG, t, applyStatic } from './i18n.js';

const $ = (s) => document.querySelector(s);
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const REASON = { checkmate: t('Mat'), stalemate: t('Pat'), threefold: t('Uch marta takrorlanish'), fifty: t('50 yurish qoidasi'),
  insufficient: t('Mat qilish uchun dona yetarli emas'), resign: t('Taslim boʻlindi'), agreed: t('Kelishuv boʻyicha durang'), timeout: t('Vaqt tugadi') };

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
// TG.userName() Telegramdan tashqarida 'Siz' qaytaradi — uni tarjima qilamiz
function myName() { const n = TG.userName(); return n === 'Siz' ? t('Siz') : n; }
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
  if (S.mode === 'online' || S.mode === 'task' || S.bot) return;
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
    if (S.mode === 'task') return c === S.player ? `${t('Siz')} <span class="rt">${S.task.goal}</span>` : S.task.title;
    if (S.bot) return c === S.player ? `${escapeHtml(myName())}<span class="rt">${botRating()}</span>` : `${escapeHtml(S.bot.name)}<span class="rt">${S.bot.rating}</span><span class="bot-tag">BOT</span>`;
    if (S.mode === 'ai') return c === S.player ? escapeHtml(myName()) : `${t('Kompyuter')} <span class="rt">${t(LEVELS[S.level].name)}</span>`;
    if (room) {
      const p = c === 'w' ? room.white : room.black;
      if (!p) return t('Raqib kutilmoqda…');
      return `${escapeHtml(p.name)}<span class="rt">${p.rating}</span>${p.online === false ? `<span class="off">${t('tarmoqda emas')}</span>` : ''}`;
    }
    return c === 'w' ? t('Oq') : t('Qora');
  };
  for (const [bar, c] of [[$('#barTop'), topColor], [$('#barBottom'), bottomColor]]) {
    bar.querySelector('.pname').innerHTML = name(c);
    bar.querySelector('.ava').className = 'ava ' + c + (S.mode === 'ai' && c !== S.player ? ' ai' : '');
    bar.dataset.color = c;
    const opp = c === 'w' ? 'b' : 'w';
    bar.querySelector('.caps').innerHTML = capturedBy[c].sort((a, b) => VAL[b] - VAL[a]).map((p) => pieceIcon(p, opp)).join('');
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
  const on = S.mode === 'online', task = S.mode === 'task', botG = !!S.bot;
  $('#tUndo em').textContent = on || task || botG ? '' : pro ? '∞' : String(Math.max(0, FREE_UNDOS - S.undos));
  $('#tHint em').textContent = on || task || botG ? '' : pro ? '∞' : String(Math.max(0, FREE_HINTS - S.hints));
  $('#tUndo i').innerHTML = icon(on ? 'smile' : 'undo'); $('#tUndo span').textContent = on ? t('Emoji') : t('Orqaga');
  $('#tHint i').innerHTML = icon(on ? 'half' : 'hint'); $('#tHint span').textContent = on ? t('Durang') : t('Maslahat');
  $('#tResign span').textContent = S.mode === 'friend' ? t('Durang') : task ? t('Yechim') : t('Taslim');
  $('#tResign i').innerHTML = icon(S.mode === 'friend' ? 'half' : task ? 'eye' : 'flag');
  if (task) $('#tUndo span').textContent = t('Qayta');
  drawClocks();
}

// ───────────── onlayn: soatlar ─────────────
function fmtClock(ms) {
  ms = Math.max(0, ms);
  const s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
  return ms < 10000 ? (ms / 1000).toFixed(1) : `${m}:${String(s % 60).padStart(2, '0')}`;
}
function clockLeft(c) {
  if (S.bot) {
    const b = S.bot;
    return b.clocks[c] - (!S.over && b.turnAt && S.chess.turn() === c ? Date.now() - b.turnAt : 0);
  }
  const r = S.online && S.online.room;
  if (!r || !r.tc || !r.tc.base) return null;
  let ms = r.clocks[c];
  if (r.status === 'playing' && r.turnStartedAt && S.chess.turn() === c) ms -= Date.now() + S.online.offset - r.turnStartedAt;
  return ms;
}
function drawClocks() {
  for (const bar of [$('#barTop'), $('#barBottom')]) {
    let el = bar.querySelector('.clk');
    const ms = S.mode === 'online' || S.bot ? clockLeft(bar.dataset.color) : null;
    if (ms === null) { if (el) el.remove(); continue; }
    if (!el) { el = document.createElement('div'); el.className = 'clk'; bar.appendChild(el); }
    el.textContent = fmtClock(ms);
    el.classList.toggle('low', ms < 20000);
    el.classList.toggle('run', S.bot ? !S.over && !!S.bot.turnAt && S.chess.turn() === bar.dataset.color
      : S.online.room.status === 'playing' && S.chess.turn() === bar.dataset.color && !!S.online.room.turnStartedAt);
  }
}
setInterval(() => {
  if (S.mode === 'online' || S.bot) drawClocks();
  if (S.bot && !S.over && S.bot.turnAt && clockLeft(S.chess.turn()) <= 0) {
    const loser = S.chess.turn();
    checkGameOver({ reason: 'timeout', winner: loser === 'w' ? 'b' : 'w' });
  }
}, 200);

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
async function startGame(mode, level = 1, color = 'w', restore = null, bot = null) {
  closeModal(); $('#levelSheet').classList.add('hidden');
  S.bot = bot;
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
  if (S.bot) S.bot.turnAt = Date.now();
  saveGame();
  maybeAI();
}

function afterPosition(quiet = false) {
  const last = S.chess.history({ verbose: true }).slice(-1)[0];
  scene.setLastMove(last ? last.from : null, last ? last.to : null);
  scene.setCheck(S.chess.inCheck() ? kingSquare(S.chess.turn()) : null);
  updateHUD();
  if (!quiet && S.chess.inCheck() && !S.chess.isCheckmate()) { flashStatus(t('Shoh!')); play('check'); TG.haptic('warning'); }
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
  if (S.mode === 'task') return taskAfterHuman();
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
  if (S.bot && S.bot.turnAt) { S.bot.clocks[mv.color] += S.bot.tc.inc * 1000 - (Date.now() - S.bot.turnAt); S.bot.turnAt = null; }
  const kind = mv.flags.includes('k') || mv.flags.includes('q') ? 'castle' : mv.captured ? 'capture' : 'move';
  if (kind === 'capture' && scene.effect === 'chaqmoq') setTimeout(() => play('zap'), 250);
  if (kind === 'capture' && scene.effect === 'olov') setTimeout(() => play('fire'), 250);
  await scene.animateMove(mv, { dropped });
  play(mv.promotion ? 'promote' : kind);
  TG.haptic(kind === 'capture' ? 'medium' : 'light');
  if (S.bot && !S.over) S.bot.turnAt = Date.now();
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
  let opts = LEVELS[S.level].opts;
  if (S.bot) {
    const left = clockLeft(S.chess.turn());
    opts = { ...opts, timeMs: Math.max(120, Math.min(opts.timeMs || 1000, left / 35)) };
  }
  const r = await aiSearch(S.chess.fen(), opts);
  if (req !== S.aiReq || S.mode !== 'ai' || S.over) { setThinking(false); return; } // oʻyin almashgan
  const spent = performance.now() - t0;
  const pad = S.bot ? 600 + Math.random() * 900 : 450; // bot ham biroz "oʻylaydi"
  if (spent < pad) await new Promise((res) => setTimeout(res, pad - spent));
  if (req !== S.aiReq || S.over) { setThinking(false); return; }
  setThinking(false);
  if (!r.ok || !r.move) { S.busy = false; return; }
  await playMove({ from: r.move.slice(0, 2), to: r.move.slice(2, 4), promotion: r.move[4] });
}

async function checkGameOver(forced = null) {
  if (S.mode === 'online' || S.mode === 'task') return; // onlayn natijani server, masalani taskSolved hal qiladi
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
  const key = S.bot ? 'bot' : S.mode === 'ai' ? 'l' + S.level : 'friend';
  const st = S.stats[key] || (S.stats[key] = { w: 0, l: 0, d: 0 });
  st[outcome === 'win' ? 'w' : outcome === 'loss' ? 'l' : 'd']++;
  if (S.bot) {
    const my = botRating(), exp = 1 / (1 + 10 ** ((S.bot.rating - my) / 400));
    const score = outcome === 'win' ? 1 : outcome === 'loss' ? 0 : 0.5;
    S.bot.delta = Math.round(24 * (score - exp));
    S.stats.botRating = my + S.bot.delta;
    if (outcome === 'win' && NET.onlineAvailable()) NET.api('/api/points', { kind: 'bot' }).catch(() => {});
  }
  if (S.mode === 'ai' && outcome === 'win' && reason === 'checkmate') S.stats.fastest = Math.min(S.stats.fastest || 99, Math.ceil(c.history().length / 2));
  markPlayedDay(S.stats);
  TG.storeSet('stats', S.stats);
  if (reason === 'checkmate') {
    flashStatus(t('Mat'), 1400);
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
  afterEvent();
}

function showResult(outcome, reason, winner) {
  let big, title;
  big = winner === 'w' ? '1–0' : winner === 'b' ? '0–1' : '½–½';
  if (S.mode === 'friend' && winner) title = winner === 'w' ? t('Oq yutdi') : t('Qora yutdi');
  else if (outcome === 'win') title = t('Gʻalaba');
  else if (outcome === 'loss') title = t('Magʻlubiyat');
  else title = t('Durang');
  const moves = Math.ceil(S.chess.history().length / 2);
  const nextLvl = S.mode === 'ai' && !S.bot && outcome === 'win' && S.level < 3;
  openModal(`<div class="result ${outcome}">${medallion(big)}<h2>${title}</h2><p>${t('{reason}, {n} yurish', { reason: REASON[reason] || '', n: moves })}</p>
    ${S.bot ? `<p class="delta ${S.bot.delta >= 0 ? 'up' : 'down'}">${t('Bot reytingi: {d} → {r}', { d: (S.bot.delta >= 0 ? '+' : '') + S.bot.delta, r: botRating() })}</p>` : ''}
    ${nextLvl ? `<p>${t('Keyingi daraja: <b>{level}</b> — sinab koʻrasizmi?', { level: t(LEVELS[S.level + 1].name) })}</p>` : ''}
    <button class="btn primary" id="rAgain">${t('Yana oʻynash')}</button>
    ${nextLvl ? `<button class="btn" id="rNext">${t('⬆️ Keyingi daraja')}</button>` : ''}
    <button class="btn" id="rAn">${icon('chart', 20)}${t('Oʻyin tahlili')}</button>
    <button class="btn" id="rShare">${icon('send', 20)}${t('Natijani ulashish')}</button>
    <button class="btn ghost" id="rHome">${t('Bosh menyu')}</button></div>`);
  $('#rAgain').onclick = () => S.bot ? startBotGame(S.bot.tcStr) : startGame(S.mode, S.level, S.mode === 'ai' ? (S.settings.lastColor === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : S.player) : 'w');
  const nx = $('#rNext'); if (nx) nx.onclick = () => startGame('ai', S.level + 1, S.player);
  const who = S.bot ? `${S.bot.name} (Bot, ${S.bot.rating})` : S.mode === 'ai' ? t('Kompyuter ({level})', { level: t(LEVELS[S.level].name) }) : t('Bir telefonda');
  $('#rShare').onclick = () => shareResult(`${title} ${big}`, t('{who} · {reason} · {n} yurish', { who, reason: REASON[reason] || '', n: moves }));
  $('#rAn').onclick = () => analyzeGame();
  $('#rHome').onclick = () => goHome();
}

function goHome() {
  closeModal(); S.aiReq++;
  scene.confetti.n = 0;
  leaveOnline();
  S.busy = false; S.selected = null; scene.clearSelection(); scene.clearHint();
  const wasOnline = S.mode === 'online', wasTask = S.mode === 'task', wasBot = !!S.bot;
  S.bot = null;
  if (!S.over && S.mode) saveGame();
  S.mode = null;
  S.task = null;
  if (wasOnline || wasTask || wasBot) { S.chess = new Chess(); scene.syncBoard(S.chess.board()); scene.setLastMove(null); scene.setCheck(null); }
  $('#hud').classList.add('hidden'); $('#home').classList.remove('hidden');
  $('#btnContinue').classList.toggle('hidden', !S.chess.history().length || S.over);
  updateHomeBadges();
  TG.setBack(null);
  scene.setInsets(160, 330); scene.setOrientation('w');
  scene.setIdle(true);
}

// ───────────── asboblar ─────────────
async function doUndo() {
  if (S.mode === 'online') return openEmoji();
  if (S.mode === 'task') return taskRestart();
  if (S.bot) return toast(t('Bot bilan oʻyinda «Orqaga» yoʻq — xuddi onlayndagidek'));
  if (S.busy || !S.mode || S.over) return;
  if (!S.chess.history().length) return toast(t('Hali yurish qilinmagan'));
  if (!isPro() && S.undos >= FREE_UNDOS) return upsell(t('Bepul «Orqaga» tugadi (oʻyinda 3 ta).'));
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
  if (S.mode === 'task') return taskHint();
  if (S.bot) return toast(t('Bot bilan oʻyinda maslahat yoʻq — xuddi onlayndagidek'));
  if (S.busy || !S.mode || S.over || !isHumanTurn()) return;
  if (!isPro() && S.hints >= FREE_HINTS) return upsell(t('Bepul maslahat tugadi (oʻyinda 1 ta).'));
  S.busy = true; toast(t('Eng yaxshi yurish izlanmoqda…'), 1200);
  const r = await aiSearch(S.chess.fen(), { timeMs: 1200 });
  S.busy = false;
  if (r.ok && r.move) { S.hints++; scene.showHint(r.move.slice(0, 2), r.move.slice(2, 4)); updateHUD(); saveGame(); play('promote'); }
}

function doResign() {
  if (S.mode === 'task') return taskShowSolution();
  if (S.mode === 'online') {
    if (S.over || !S.online.room || !S.online.room.you) return;
    openModal(`<h2>${t('Taslim boʻlasizmi?')}</h2><p class="muted" style="text-align:center">${t('Oʻyin magʻlubiyat sifatida yoziladi.')}</p>
      <button class="btn primary" id="yes">${t('Ha, taslim')}</button><button class="btn ghost" data-close>${t('Davom etish')}</button>`);
    $('#yes').onclick = () => { closeModal(); S.online.ws.send({ t: 'resign' }); };
    return;
  }
  if (S.busy || !S.mode || S.over) return;
  if (S.mode === 'friend') {
    openModal(`<h2>${t('Durangga kelishasizmi?')}</h2><p class="muted" style="text-align:center">${t('Ikkala oʻyinchi ham rozimi?')}</p>
      <button class="btn primary" id="yes">${t('Ha, durang')}</button><button class="btn ghost" data-close>${t('Yoʻq')}</button>`);
    $('#yes').onclick = () => { closeModal(); checkGameOver({ reason: 'agreed' }); };
  } else {
    openModal(`<h2>${t('Taslim boʻlasizmi?')}</h2><p class="muted" style="text-align:center">${t('Oʻyin magʻlubiyat sifatida yoziladi.')}</p>
      <button class="btn primary" id="yes">${t('Ha, taslim')}</button><button class="btn ghost" data-close>${t('Davom etish')}</button>`);
    $('#yes').onclick = () => { closeModal(); checkGameOver({ reason: 'resign', winner: S.player === 'w' ? 'b' : 'w' }); };
  }
}

function upsell(text) {
  openModal(`<h2>PRO</h2><p class="muted" style="text-align:center">${text}<br>${t('PRO bilan «Orqaga» va «Maslahat» cheksiz.')}</p>
    <button class="btn primary" id="upBuy">${t('PRO olish, {price} ⭐', { price: ITEMS.find((i) => i.id === 'pro').price })}</button>
    <button class="btn" id="upShop">${t('Doʻkonni ochish')}</button><button class="btn ghost" data-close>${t('Yopish')}</button>`);
  $('#upBuy').onclick = () => buy(ITEMS.find((i) => i.id === 'pro'));
  $('#upShop').onclick = () => openShop();
}

// ───────────── masalalar (task rejimi) ─────────────
// S.task = { kind: 'puzzle', n, fen, sol: [m1, javob], step, title, goal, tries }
const sideName = (c) => (c === 'w' ? t('Oq') : t('Qora'));
const uciOf = (m) => m.from + m.to + (m.promotion || '');

function puzzleStats() { return S.stats.puzzle || (S.stats.puzzle = { solved: [], streak: 0, best: 0, last: 0 }); }

async function startPuzzle(n) {
  const p = puzzleFor(n);
  const turn = p.fen.split(' ')[1];
  const title = isPractice(n) ? t('Mashq №{n}', { n: n - 1000 }) : t('Masala №{n}', { n });
  await startTask({ kind: 'puzzle', n, fen: p.fen, sol: p.sol, mate: true, title, goal: turn === 'w' ? t('Oq yuradi: 2 yurishda mot') : t('Qora yuradi: 2 yurishda mot') });
}

// ───── darslar ─────
function lessonDone(id) { return !!(S.stats.lessons || {})[id]; }

function openLessons() {
  const done = LESSONS.filter((l) => lessonDone(l.id)).length;
  openModal(`<h2>${t('Darslar')}</h2><p class="muted center">${t('Shaxmatni noldan oʻrganing: donalar, maxsus yurishlar va birinchi motlar. {done}/{total} tugallangan.', { done, total: LESSONS.length })}</p>
    <div class="lesson-list">${LESSONS.map((l, i) => `<button class="lesson ${lessonDone(l.id) ? 'done' : ''}" data-l="${i}">
      <span class="lesson-ic">${lessonDone(l.id) ? icon('check', 20) : pieceIcon(l.icon, 'w', 26)}</span>
      <span class="lesson-t">${i + 1}. ${t(l.title)}<small>${t('{n} ta topshiriq', { n: l.tasks.length })}</small></span></button>`).join('')}</div>
    <button class="btn ghost" data-close>${t('Yopish')}</button>`);
  $('#modalCard').querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => openLesson(+b.dataset.l)));
}

function openLesson(i) {
  const l = LESSONS[i];
  openModal(`<div class="lesson-intro"><span class="lesson-big">${pieceIcon(l.icon, 'w', 56)}</span><h2>${i + 1}. ${t(l.title)}</h2>
    <p>${t(l.text)}</p></div>
    <button class="btn primary" id="lGo">${t('Topshiriqni boshlash')}</button><button class="btn ghost" id="lBack">${t('Darslar roʻyxati')}</button>`);
  $('#lGo').onclick = () => startLessonTask(i, 0);
  $('#lBack').onclick = () => openLessons();
}

function startLessonTask(i, k) {
  const l = LESSONS[i], task = l.tasks[k];
  return startTask({ kind: 'lesson', lesson: i, k, fen: task.fen, sol: task.sol, mate: !!task.mate,
    title: `${t(l.title)} · ${k + 1}/${l.tasks.length}`, goal: t(task.goal) });
}

async function lessonTaskDone() {
  const tk = S.task, l = LESSONS[tk.lesson];
  markPlayedDay(S.stats);
  const lastTask = tk.k >= l.tasks.length - 1;
  if (lastTask) { (S.stats.lessons || (S.stats.lessons = {}))[l.id] = Date.now(); }
  TG.storeSet('stats', S.stats);
  await new Promise((r) => setTimeout(r, S.chess.isCheckmate() ? 1600 : 700));
  const nextLesson = LESSONS.findIndex((x, j) => j > tk.lesson && !lessonDone(x.id));
  openModal(`<div class="result win">${medallion('✓')}<h2>${lastTask ? t('Dars tugadi!') : t('Toʻgʻri!')}</h2>
    <p>${lastTask ? t('«{title}» darsini oʻzlashtirdingiz.', { title: t(l.title) }) : t('{goal} — bajarildi.', { goal: tk.goal })}</p>
    ${!lastTask ? `<button class="btn primary" id="lNext">${t('Keyingi topshiriq')}</button>`
      : nextLesson >= 0 ? `<button class="btn primary" id="lNextL">${t('Keyingi dars: {title}', { title: t(LESSONS[nextLesson].title) })}</button>`
        : `<p class="muted center">${t('Barcha darslar tugadi! Endi kompyuterga qarshi «Boshlovchi» darajasida oʻynab koʻring.')}</p><button class="btn primary" id="lPlay">${t('Oʻyinni boshlash')}</button>`}
    <button class="btn" id="lList">${t('Darslar roʻyxati')}</button><button class="btn ghost" id="lHome">${t('Bosh menyu')}</button></div>`);
  const a = $('#lNext'); if (a) a.onclick = () => startLessonTask(tk.lesson, tk.k + 1);
  const b = $('#lNextL'); if (b) b.onclick = () => openLesson(nextLesson);
  const c = $('#lPlay'); if (c) c.onclick = () => startGame('ai', 0, 'w');
  $('#lList').onclick = () => { goHome(); openLessons(); };
  $('#lHome').onclick = () => goHome();
  S.busy = false;
  afterEvent();
}

async function startTask(task) {
  closeModal(); $('#levelSheet').classList.add('hidden');
  leaveOnline();
  S.mode = 'task'; S.task = { ...task, step: 0, tries: 0 };
  S.chess = new Chess(task.fen); S.player = S.chess.turn();
  S.over = false; S.busy = true; S.selected = null; S.aiReq++;
  $('#home').classList.add('hidden'); $('#hud').classList.remove('hidden');
  TG.setBack(() => goHome());
  scene.setInsets(78, 192);
  scene.setIdle(false); scene.clearSelection(); scene.clearHint(); scene.setCheck(null); scene.setLastMove(null);
  scene.setOrientation(S.player);
  updateHUD();
  play('castle');
  await scene.setBoard(S.chess.board(), true);
  afterPosition(true);
  S.busy = false;
  toast(task.goal, 2600);
}

const optsOf = (s) => (Array.isArray(s) ? s : [s]);

function taskExpected() {
  const t = S.task;
  if (t.step < t.sol.length) return optsOf(t.sol[t.step])[0];
  if (!t.mate) return null;
  // oxirgi (mot) yurish: istalgan mot qiluvchi yurish toʻgʻri
  for (const m of S.chess.moves({ verbose: true })) {
    S.chess.move(m); const mate = S.chess.isCheckmate(); S.chess.undo();
    if (mate) return uciOf(m);
  }
  return null;
}

async function taskAfterHuman() {
  const tk = S.task;
  const last = S.chess.history({ verbose: true }).slice(-1)[0];
  if (!last) return;
  const good = tk.step < tk.sol.length ? optsOf(tk.sol[tk.step]).includes(uciOf(last)) : S.chess.isCheckmate();
  if (good && tk.step < tk.sol.length) {
    tk.step++;
    if (tk.step < tk.sol.length) { // raqib javobi
      play('promote'); TG.haptic('light');
      await new Promise((r) => setTimeout(r, 450));
      const r = optsOf(tk.sol[tk.step])[0];
      await playMove({ from: r.slice(0, 2), to: r.slice(2, 4), promotion: r[4] });
      tk.step++;
    }
    if (tk.step >= tk.sol.length && !tk.mate) return taskSolved();
    if (tk.step < tk.sol.length) toast(t('Toʻgʻri! Davom eting'), 1400);
    else toast(t('Endi mot qiling!'), 1600);
    return;
  }
  if (!good) {
    tk.tries++;
    S.busy = true;
    flashStatus(t('Notoʻgʻri'), 900); play('lose'); TG.haptic('error');
    await new Promise((r) => setTimeout(r, 750));
    S.chess.undo();
    await scene.syncBoard(S.chess.board());
    afterPosition(true);
    S.busy = false;
    if (tk.tries >= 2) toast(t('Maslahat tugmasini bosib koʻring'), 2000);
    return;
  }
  await taskSolved();
}

async function taskSolved() {
  const tk = S.task;
  S.over = true; S.busy = true;
  updateHUD();
  if (S.chess.isCheckmate()) { flashStatus(t('Mat'), 1200); scene.checkmate(kingSquare(S.chess.turn()), S.player); }
  else flashStatus(t('Barakalla'), 900);
  play('win'); TG.haptic('success');
  if (tk.kind === 'lesson') return lessonTaskDone();
  const ps = puzzleStats();
  const first = !ps.solved.includes(tk.n);
  if (first) ps.solved.push(tk.n);
  const today = puzzleNumber();
  if (tk.n === today && ps.last !== today) {
    ps.streak = ps.last === today - 1 ? (ps.streak || 0) + 1 : 1;
    ps.best = Math.max(ps.best || 0, ps.streak);
    ps.last = today;
  }
  markPlayedDay(S.stats);
  TG.storeSet('stats', S.stats);
  if (t.n === today && NET.onlineAvailable()) NET.api('/api/points', { kind: 'puzzle', n: today }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1800));
  const daily = tk.n === today;
  const next = nextUnsolved(tk.n);
  openModal(`<div class="result win">${medallion('✓')}<h2>${t('Barakalla!')}</h2>
    <p>${tk.tries ? t('{title} yechildi.', { title: tk.title }) : t('{title} yechildi, birinchi urinishda.', { title: tk.title })}</p>
    ${daily ? `<p class="streak">${icon('bolt', 18)} ${t('Seriya: <b>{n} kun</b>', { n: ps.streak })}${ps.best > ps.streak ? ` · ${t('eng yaxshisi {n}', { n: ps.best })}` : ''}</p>` : ''}
    ${next ? `<button class="btn primary" id="pNext">${isPractice(next) ? t('Keyingi: mashq №{n}', { n: next - 1000 }) : t('Keyingi: masala №{n}', { n: next })}</button>` : `<p class="muted center">${t('Barcha masalalar yechildi. Ertaga yangisi chiqadi!')}</p>`}
    <button class="btn" id="pShare">${icon('send', 20)}${t('Doʻstlarga yuborish')}</button>
    <button class="btn ghost" id="pHome">${t('Bosh menyu')}</button></div>`);
  const nb = $('#pNext'); if (nb) nb.onclick = () => startPuzzle(next);
  $('#pShare').onclick = () => shareResult(t('{title} yechildi', { title: tk.title }), daily ? t('2 yurishda mot · seriya {n} kun', { n: ps.streak }) : t('2 yurishda mot'));
  $('#pHome').onclick = () => goHome();
  S.busy = false;
  afterEvent();
}

function nextUnsolved(from) {
  const solved = new Set(puzzleStats().solved), today = puzzleNumber();
  if (!solved.has(today)) return today;
  for (let n = 1001; n <= 1000 + PRACTICE; n++) if (!solved.has(n) && n !== from) return n;
  for (let n = today - 1; n >= 1; n--) if (!solved.has(n) && n !== from) return n;
  return null;
}

async function taskRestart() {
  if (S.busy) return;
  const { step, tries, ...task } = S.task; void step; void tries;
  await startTask(task);
}

function taskHint() {
  if (S.busy || S.over) return;
  const mv = taskExpected();
  if (!mv) return;
  scene.showHint(mv.slice(0, 2), mv.slice(2, 4)); play('promote');
  toast(t('Yashil oʻq — toʻgʻri yurish'), 1600);
}

async function taskShowSolution() {
  if (S.busy || S.over) return;
  S.busy = true;
  while (!S.chess.isCheckmate()) {
    const mv = taskExpected();
    if (!mv) break;
    await playMove({ from: mv.slice(0, 2), to: mv.slice(2, 4), promotion: mv[4] });
    S.busy = true;
    S.task.step++;
    await new Promise((r) => setTimeout(r, 500));
  }
  S.over = true; S.busy = false;
  updateHUD();
  openModal(`<h2>${t('Yechim')}</h2><p class="muted center">${S.chess.history().join(', ')}</p>
    <button class="btn primary" id="pAgain">${t('Oʻzim qayta yechaman')}</button><button class="btn ghost" id="pHome">${t('Bosh menyu')}</button>`);
  $('#pAgain').onclick = () => taskRestart();
  $('#pHome').onclick = () => goHome();
}

function openPuzzles() {
  const today = puzzleNumber(), ps = puzzleStats(), solved = new Set(ps.solved);
  const list = [];
  for (let n = today; n >= Math.max(1, today - 59); n--) list.push(n);
  openModal(`<h2>${t('Kunlik masalalar')}</h2>
    <p class="muted center">${t('Har kuni yangi masala: 2 yurishda mot. Seriya: <b>{n} kun</b> · yechilgan: {s}', { n: ps.last >= today - 1 ? ps.streak || 0 : 0, s: solved.size })}</p>
    <button class="btn primary" id="pzToday">${solved.has(today) ? t('Bugungi masala yechilgan ✓') : t('Bugungi masala (№{n})', { n: today })}</button>
    <div class="shop-sec">${t('Kunlik')}</div>
    <div class="pz-grid">${list.map((n) => `<button class="pz ${solved.has(n) ? 'done' : ''} ${n === today ? 'today' : ''}" data-n="${n}">${solved.has(n) ? icon('check', 14) : ''}${n}</button>`).join('')}</div>
    <div class="shop-sec">${t('Mashq uchun')}</div>
    <div class="pz-grid">${Array.from({ length: PRACTICE }, (_, i) => 1001 + i).map((n) => `<button class="pz ${solved.has(n) ? 'done' : ''}" data-n="${n}">${solved.has(n) ? icon('check', 14) : ''}${n - 1000}</button>`).join('')}</div>
    <button class="btn ghost" data-close>${t('Yopish')}</button>`);
  $('#pzToday').onclick = () => startPuzzle(today);
  $('#modalCard').querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => startPuzzle(+b.dataset.n)));
}

function updateHomeBadges() {
  const ps = puzzleStats(), today = puzzleNumber();
  const streak = ps.last >= today - 1 ? ps.streak || 0 : 0;
  const el = $('#pzSub');
  if (el) el.textContent = ps.solved.includes(today) ? t('Yechildi · {n} kun', { n: streak }) : streak ? t('Seriya {n} kun', { n: streak }) : t('2 yurishda mot');
  const ld = LESSONS.filter((l) => lessonDone(l.id)).length;
  const le = $('#lsSub'); if (le) le.textContent = ld ? t('{d}/{n} tugallangan', { d: ld, n: LESSONS.length }) : t('Noldan oʻrganing');
  $('#btnPuzzle').classList.toggle('done', ps.solved.includes(today));
}

// ───────────── doʻstlarni taklif qilish ─────────────
function shareInvite(text) {
  const link = S.ref ? S.ref.link : `https://t.me/${BOT_USERNAME}`;
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg && tg.openTelegramLink) tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(text));
  else if (!TG.shareGame(text + ' ' + link)) toast(t('Ulashish faqat Telegram ichida'));
}

async function openInvite() {
  if (!needOnline()) return;
  openModal(`<h2>${t('Doʻstlarni taklif qiling')}</h2><p class="muted center">${t('Yuklanmoqda…')}</p>`);
  try {
    S.ref = await NET.api('/api/ref');
  } catch (e) { toast(t('Maʼlumotni yuklab boʻlmadi')); closeModal(); return; }
  const r = S.ref;
  const title = (id) => { const it = ITEMS.find((i) => i.id === id); return it ? t(it.name) : id; };
  openModal(`<h2>${t('Doʻstlarni taklif qiling')}</h2>
    <p class="muted center">${t('Havolangiz orqali kelgan har bir yangi doʻst uchun sizga bitta effekt yoki mavzu <b>tekin</b> ochiladi.')}</p>
    <div class="ref-box"><div class="ref-n">${r.count}</div><div>${t('taklif qilingan doʻst', { n: r.count })}${r.next ? `<small>${t('Keyingi sovgʻa: <b>{item}</b>', { item: escapeHtml(title(r.next)) })}</small>` : `<small>${t('Sizda hamma narsa ochiq')}</small>`}</div></div>
    <button class="btn primary" id="iShare">${icon('send', 20)}${t('Telegramda yuborish')}</button>
    <button class="btn" id="iCopy">${icon('link', 20)}${t('Havolani nusxalash')}</button>
    ${r.friends.length ? `<div class="shop-sec">${t('Sizning doʻstlaringiz')}</div><table class="stats">${r.friends.map((f) => `<tr><td>${escapeHtml(f.name)}</td><td>${f.item ? escapeHtml(title(f.item)) : '—'}</td></tr>`).join('')}</table>` : ''}
    <button class="btn ghost" data-close>${t('Yopish')}</button>`);
  $('#iShare').onclick = () => shareInvite(t('Keling, Shaxmat 3D da oʻynaymiz! Chiroyli 3D shaxmat, kunlik masalalar va onlayn reyting ♟'));
  $('#iCopy').onclick = async () => { try { await navigator.clipboard.writeText(r.link); toast(t('Havola nusxalandi')); } catch (e) { toast(r.link, 5000); } };
  afterEvent();
}

// ───────────── oʻyin tahlili ─────────────
const KIND = { blunder: [t('Qoʻpol xato'), '??'], mistake: [t('Xato'), '?'], inacc: [t('Noaniqlik'), '?!'] };

async function analyzeGame() {
  const hist = S.chess.history({ verbose: true });
  if (hist.length < 4) return toast(t('Tahlil uchun yurishlar juda kam'));
  const startFen = (S.mode === 'online' && S.online && S.online.room && S.online.room.startFen) || undefined;
  const c0 = new Chess(startFen);
  const fens = [c0.fen()];
  for (const m of hist) { c0.move(m); fens.push(c0.fen()); }
  let cancelled = false;
  openModal(`<h2>${t('Oʻyin tahlili')}</h2><p class="muted center">${t('Har bir yurish tekshirilmoqda…')} <b id="anP">0</b>%</p>
    <div class="bar"><i id="anBar"></i></div><button class="btn ghost" id="anStop">${t('Bekor qilish')}</button>`);
  $('#anStop').onclick = () => { cancelled = true; closeModal(); };
  const cap = (s) => Math.max(-2000, Math.min(2000, s || 0));
  const best = [];
  for (let i = 0; i < fens.length; i++) {
    if (cancelled) return;
    const c = new Chess(fens[i]);
    if (c.isGameOver()) best.push({ score: c.isCheckmate() ? -2000 : 0, move: null });
    else { const r = await aiSearch(fens[i], { timeMs: 200 }); best.push({ score: cap(r.score), move: r.ok ? r.move : null }); }
    const p = Math.round(((i + 1) / fens.length) * 100);
    const el = $('#anP'); if (el) el.textContent = p;
    const bar = $('#anBar'); if (bar) bar.style.width = p + '%';
  }
  if (cancelled) return;
  const mine = (col) => S.mode === 'friend' || col === S.player || (S.mode === 'online' && S.online && S.online.room && !S.online.room.you);
  const items = [], count = { w: { blunder: 0, mistake: 0, inacc: 0, best: 0 }, b: { blunder: 0, mistake: 0, inacc: 0, best: 0 } };
  for (let i = 0; i < hist.length; i++) {
    const m = hist[i];
    if (best[i].move && uciOf(m) === best[i].move) { count[m.color].best++; continue; }
    const loss = best[i].score - (-best[i + 1].score);
    const kind = loss >= 300 ? 'blunder' : loss >= 120 ? 'mistake' : loss >= 60 ? 'inacc' : null;
    if (!kind) continue;
    count[m.color][kind]++;
    if (!mine(m.color)) continue;
    let bsan = '';
    try { bsan = new Chess(fens[i]).move({ from: best[i].move.slice(0, 2), to: best[i].move.slice(2, 4), promotion: best[i].move[4] }).san; } catch (e) { /* */ }
    items.push({ i, kind, san: m.san, bsan, best: best[i].move, color: m.color, no: Math.floor(i / 2) + 1 });
  }
  S.analysis = { fens, items, count };
  S.stats.analyzed = (S.stats.analyzed || 0) + 1; TG.storeSet('stats', S.stats);
  showAnalysis();
}

function showAnalysis() {
  const { items, count } = S.analysis, pro = isPro();
  const sides = S.mode === 'friend' ? ['w', 'b'] : [S.player];
  const row = (it, locked) => `<button class="an-row ${it.kind} ${locked ? 'locked' : ''}" data-a="${locked ? '' : it.i}">
      <span class="an-no">${it.no}${it.color === 'w' ? '.' : '…'}</span><b>${it.san}${KIND[it.kind][1]}</b>
      <span class="an-best">${locked ? icon('lock', 14) + ' PRO' : it.bsan ? t('yaxshisi: {m}', { m: it.bsan }) : ''}</span></button>`;
  const shown = pro ? items : items.slice(0, 1);
  openModal(`<h2>${t('Oʻyin tahlili')}</h2>
    ${sides.map((s) => `<div class="an-sum">${S.mode === 'friend' ? `<b>${sideName(s)}</b>` : ''}
      <span class="an-chip blunder">${t('{n} qoʻpol xato', { n: count[s].blunder })}</span><span class="an-chip mistake">${t('{n} xato', { n: count[s].mistake })}</span><span class="an-chip inacc">${t('{n} noaniqlik', { n: count[s].inacc })}</span></div>`).join('')}
    ${items.length ? `<p class="muted">${t('Yurishni bosing — doskada eng yaxshi yurish koʻrsatiladi')}</p><div class="an-list">${shown.map((it) => row(it, false)).join('')}${pro ? '' : items.slice(1).map((it) => row(it, true)).join('')}</div>`
      : `<p class="muted center">${t('Ajoyib! Jiddiy xato topilmadi.')}</p>`}
    ${!pro && items.length > 1 ? `<button class="btn primary" id="anPro">${t('Toʻliq tahlil — PRO, {price} ⭐', { price: ITEMS.find((i) => i.id === 'pro').price })}</button>` : ''}
    <button class="btn" id="anNew">${t('Yangi oʻyin')}</button><button class="btn ghost" id="anHome">${t('Bosh menyu')}</button>`);
  $('#modalCard').classList.add('short');
  scene.setInsets(78, Math.round(window.innerHeight * 0.52));
  closeModal.onClose = () => { $('#modalCard').classList.remove('short'); scene.setInsets(78, 192); scene.clearHint(); scene.syncBoard(S.chess.board()); afterPosition(true); };
  $('#modalCard').querySelectorAll('.an-row').forEach((b) => (b.onclick = () => {
    if (b.classList.contains('locked')) return upsell(t('Toʻliq tahlil PRO uchun.'));
    const it = S.analysis.items.find((x) => x.i === +b.dataset.a);
    $('#modalCard').querySelectorAll('.an-row').forEach((x) => x.classList.toggle('on', x === b));
    const c = new Chess(S.analysis.fens[it.i]);
    scene.syncBoard(c.board()); scene.setCheck(null); scene.setLastMove(null); scene.clearHint();
    if (it.best) setTimeout(() => scene.showHint(it.best.slice(0, 2), it.best.slice(2, 4)), 250);
    play('click');
  }));
  const ap = $('#anPro'); if (ap) ap.onclick = () => buy(ITEMS.find((i) => i.id === 'pro'), () => showAnalysis());
  $('#anNew').onclick = () => { closeModal(); if (S.mode === 'online') { goHome(); openOnline(); } else startGame(S.mode, S.level, S.player); };
  $('#anHome').onclick = () => goHome();
}

// ───────────── natija rasmi ─────────────
async function resultCard(title, sub) {
  const W = 1080, H = 1350, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  x.fillStyle = '#EEF0F2'; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(110,119,129,.07)';
  for (let i = 0; i < 8; i++) for (let j = 0; j < 10; j++) if ((i + j) % 2) x.fillRect(i * 140, j * 140, 140, 140);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(238,240,242,0)'); g.addColorStop(.75, '#EEF0F2'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  await document.fonts.ready;
  const logo = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'img/logo192.png'; });
  if (logo) x.drawImage(logo, 70, 62, 150, 150);
  x.fillStyle = '#2C3137'; x.font = '800 86px Onest, sans-serif'; x.textBaseline = 'alphabetic';
  x.fillText('Shaxmat 3D', 240, 150);
  x.fillStyle = '#4B525A'; x.font = '500 34px Onest, sans-serif'; x.fillText(t('Uch oʻlchamli doska, jonli donalar'), 244, 198);
  // doska
  const B = 760, bx = (W - B) / 2, by = 262, q = B / 8, flip = scene.orientation === 'b';
  x.fillStyle = '#4e2a16'; x.beginPath(); x.roundRect(bx - 26, by - 26, B + 52, B + 52, 22); x.fill();
  const board = S.chess.board();
  const last = S.chess.history({ verbose: true }).slice(-1)[0];
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const rr = flip ? 7 - r : r, ff = flip ? 7 - f : f;
    const sq = String.fromCharCode(97 + ff) + (8 - rr);
    x.fillStyle = (rr + ff) % 2 ? '#7d4b2a' : '#e2c59a';
    x.fillRect(bx + f * q, by + r * q, q, q);
    if (last && (sq === last.from || sq === last.to)) { x.fillStyle = 'rgba(255,214,90,.42)'; x.fillRect(bx + f * q, by + r * q, q, q); }
    const p = board[rr][ff];
    if (!p) continue;
    x.save(); x.translate(bx + f * q + q * 0.08, by + r * q + q * 0.06); x.scale(q * 0.84 / 24, q * 0.84 / 24);
    x.fillStyle = p.color === 'w' ? '#ffffff' : '#2C3137'; x.strokeStyle = p.color === 'w' ? '#4B525A' : '#15181b'; x.lineWidth = 1.3; x.lineJoin = 'round';
    for (const d of piecePaths(p.type)) { const path = new Path2D(d); x.fill(path); x.stroke(path); }
    x.restore();
  }
  x.textAlign = 'center';
  x.fillStyle = '#1F2328'; x.font = '800 78px Onest, sans-serif'; x.fillText(title, W / 2, by + B + 120);
  x.fillStyle = '#4B525A'; x.font = '500 38px Onest, sans-serif'; x.fillText(sub, W / 2, by + B + 178);
  x.fillStyle = '#2C3137'; x.beginPath(); x.roundRect(W / 2 - 300, H - 118, 600, 76, 38); x.fill();
  x.fillStyle = '#fff'; x.font = '700 34px Onest, sans-serif'; x.fillText(t('@{bot} — oʻynash', { bot: BOT_USERNAME }), W / 2, H - 68);
  return cv.toDataURL('image/jpeg', 0.88);
}

async function shareResult(title, sub) {
  if (!needOnline()) return;
  toast(t('Rasm tayyorlanmoqda…'), 1500);
  try {
    const image = await resultCard(title, sub);
    const r = await NET.api('/api/share', { image: image.split(',')[1], caption: `${title} — ${sub}` });
    const tg = window.Telegram && window.Telegram.WebApp;
    if (r.prepared && tg && tg.shareMessage) tg.shareMessage(r.prepared, (ok) => { if (ok) toast(t('Yuborildi!')); });
    else toast(t('Rasm bot chatiga yuborildi — uni doʻstlaringizga ulashing'), 3500);
  } catch (e) { toast(t('Rasm yuborib boʻlmadi: {e}', { e: e.message }), 3000); }
}

// ───────────── yutuqlar ─────────────
function afterEvent() {
  const fresh = checkAchievements({ stats: S.stats, me: S.me, refs: S.ref ? S.ref.count : 0, lessons: LESSONS.length });
  if (!fresh.length) return;
  TG.storeSet('stats', S.stats);
  fresh.forEach((a, i) => setTimeout(() => { toast(t('Yangi yutuq: {title}', { title: t(a.title) }), 2600); play('promote'); TG.haptic('success'); }, 600 + i * 2800));
}

// ───────────── onlayn oʻyin ─────────────
const TCS =[['60+0', t('1 daqiqa')], ['180+0', t('3 daqiqa')], ['180+2', t('3 + 2 soniya')], ['300+0', t('5 daqiqa')], ['600+0', t('10 daqiqa')]];
const tcText = (tc) => (!tc || !tc.base ? t('Vaqtsiz') : tc.inc ? t('{m} daq + {s} s', { m: tc.base / 60, s: tc.inc }) : t('{m} daq', { m: tc.base / 60 }));
const OREASON = { ...REASON, timeout: t('Vaqt tugadi'), abandon: t('Oʻyinchi oʻyinni tashlab ketdi'), aborted: t('Oʻyin bekor qilindi') };
const EMOJIS = ['👍', '😂', '😮', '😡', '🤝', '🔥', '👏', '😎'];

function needOnline() {
  if (NET.onlineAvailable()) return true;
  toast(NET.API ? t('Onlayn oʻyin faqat Telegram ichida ishlaydi') : t('Onlayn server tez orada ishga tushadi'));
  return false;
}

function openOnline() {
  if (!needOnline()) return;
  const me = S.me;
  openModal(`<h2>${t('Onlayn oʻyin')}</h2>${me ? `<p class="muted center">${t('Reytingingiz {r}, oʻynalgan {g}', { r: me.rating, g: me.games })}</p>` : ''}
    <p class="muted">${t('Tasodifiy raqib bilan, reytingga taʼsir qiladi')}</p>
    <div class="chips" id="tcQuick">${TCS.map(([v, l]) => `<button class="chip" data-tc="${v}">${l}</button>`).join('')}</div>
    <p class="muted">${t('Doʻstni havola bilan chaqirish')}</p>
    <div class="chips" id="tcFriend">${[...TCS, ['0+0', t('Vaqtsiz')]].map(([v, l]) => `<button class="chip ${v === '600+0' ? 'active' : ''}" data-tc="${v}">${l}</button>`).join('')}</div>
    <button class="btn primary" id="btnInvite">${icon('link', 20)}${t('Havola yaratish')}</button>
    <button class="btn" id="btnTour">${icon('trophy', 20)}${t('Haftalik turnir')}</button>
    <button class="btn" id="btnTop">${icon('chart', 20)}${t('Reyting jadvali')}</button><button class="btn ghost" data-close>${t('Yopish')}</button>`);
  const c = $('#modalCard');
  c.querySelectorAll('#tcQuick .chip').forEach((b) => (b.onclick = () => startMatch(b.dataset.tc)));
  c.querySelectorAll('#tcFriend .chip').forEach((b) => (b.onclick = () => { c.querySelectorAll('#tcFriend .chip').forEach((x) => x.classList.toggle('active', x === b)); play('click'); }));
  $('#btnInvite').onclick = () => createRoom(c.querySelector('#tcFriend .chip.active').dataset.tc);
  $('#btnTop').onclick = () => openTop();
  $('#btnTour').onclick = () => openTourney();
}

async function openTourney() {
  if (!needOnline()) return;
  openModal(`<h2>${t('Haftalik turnir')}</h2><p class="muted center">${t('Yuklanmoqda…')}</p>`);
  let tr;
  try { tr = await NET.api('/api/tournament'); } catch (e) { toast(t('Turnirni yuklab boʻlmadi')); closeModal(); return; }
  const left = Math.max(0, tr.endsAt - Date.now()), d = Math.floor(left / 86400000), h = Math.floor((left % 86400000) / 3600000);
  openModal(`<h2>${t('Haftalik turnir')}</h2>
    <p class="muted center">${t('Ochkolar: onlayn gʻalaba — 1, durang — ½, kunlik masala — 1, bot ustidan gʻalaba — ½ (kuniga 3 tagacha). Kamida {n} ta ochkoli harakat qiling. Hafta gʻolibiga yangi mavzu yoki effekt sovgʻa qilinadi.', { n: tr.minGames })}</p>
    <div class="streaks"><div><b>${t('{d}k {h}s', { d, h })}</b><small>${t('tugashiga')}</small></div><div><b>${tr.me ? tr.me.rank : '—'}</b><small>${t('sizning oʻrningiz')}</small></div><div><b>${tr.me ? tr.me.pts : 0}</b><small>${t('ochko')}</small></div></div>
    <table class="stats"><tr><th>#</th><th>${t('Oʻyinchi')}</th><th>${t('Ochko')}</th><th>${t('Oʻyin')}</th></tr>
    ${tr.top.map((r) => `<tr class="${r.me ? 'me' : ''}"><td>${r.rank}</td><td style="text-align:left">${escapeHtml(r.name)}</td><td>${r.pts}</td><td>${r.games}</td></tr>`).join('') || `<tr><td colspan="4">${t('Bu hafta hali oʻyin yoʻq — birinchi boʻling!')}</td></tr>`}</table>
    <button class="btn primary" id="trPlay">${t('Reytingli oʻyin boshlash')}</button><button class="btn ghost" data-close>${t('Yopish')}</button>`);
  $('#trPlay').onclick = () => openOnline();
}

// ───────────── bot raqib (onlayn raqib boʻlmaganda) ─────────────
const BOT_NAMES = ['Temur', 'Ulugʻbek', 'Nodir', 'Jasur', 'Malika', 'Dilnoza', 'Sardor', 'Bobur', 'Laylo', 'Aziz', 'Kamola', 'Sherzod'];
function botRating() { return S.stats.botRating || 1200; }
function startBotGame(tc) {
  const [base, inc] = String(tc).split('+').map(Number);
  const rating = Math.max(700, Math.round(botRating() + (Math.random() * 160 - 80)));
  const level = rating < 1050 ? 0 : rating < 1300 ? 1 : rating < 1550 ? 2 : 3;
  const ms = (base || 600) * 1000;
  const bot = { name: 'Bot ' + BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], rating, tc: { base: base || 600, inc: inc || 0 }, tcStr: tc,
    clocks: { w: ms, b: ms }, turnAt: null, delta: 0 };
  play('promote');
  return startGame('ai', level, Math.random() < 0.5 ? 'w' : 'b', null, bot);
}

// ───────────── hozir onlayn ─────────────
async function refreshOnline() {
  if (!NET.onlineAvailable() || document.hidden) return;
  try {
    S.onlineNow = await NET.api('/api/online');
    const sm = $('#btnOnline small');
    if (sm) sm.textContent = t('Reyting yoki doʻst bilan') + ' · ' + t('hozir onlayn: {n}', { n: S.onlineNow.online });
  } catch (e) { /* jim */ }
}

function startMatch(tc) {
  play('click');
  if (S.matchWs) S.matchWs.close();
  const t0 = Date.now();
  openModal(`<div class="result searching">${medallion('♞')}<h2>${t('Raqib izlanmoqda')}</h2>
    <p>${tcText({ base: +tc.split('+')[0], inc: +tc.split('+')[1] })} · <span id="mmT">0</span> ${t('s')}</p>
    ${S.onlineNow ? `<p class="muted center">${t('Hozir ilovada: {n} kishi', { n: S.onlineNow.online })}</p>` : ''}
    <button class="btn ghost" id="mmCancel">${t('Bekor qilish')}</button></div>`);
  let offered = false;
  const tick = setInterval(() => {
    const el = $('#mmT'); if (!el) { clearInterval(tick); return; }
    const s = Math.floor((Date.now() - t0) / 1000); el.textContent = s;
    if (s >= 20 && !offered) {
      offered = true;
      const box = document.createElement('div');
      box.innerHTML = `<p class="muted center">${t('Hozir boʻsh onlayn raqib yoʻq. Kutishda davom etishingiz yoki bot raqib bilan oʻynashingiz mumkin.')}</p>
        <button class="btn primary" id="mmBot">${icon('chip', 20)}${t('Bot raqib bilan oʻynash')}</button>`;
      $('#mmCancel').before(box);
      $('#mmBot').onclick = () => { closeModal.onClose = null; cancel(); startBotGame(tc); };
    }
  }, 500);
  const cancel = () => { clearInterval(tick); if (S.matchWs) { S.matchWs.close(); S.matchWs = null; } };
  closeModal.onClose = cancel;
  $('#mmCancel').onclick = () => closeModal();
  S.matchWs = new NET.Socket(`/ws/match?tc=${encodeURIComponent(tc)}`, (m) => {
    if (m.t === 'matched') { closeModal.onClose = null; cancel(); play('promote'); TG.haptic('success'); joinRoom(m.room); }
    else if (m.t === 'error') { toast(m.msg || t('Xatolik')); cancel(); closeModal(); }
  });
}

async function createRoom(tc) {
  play('click');
  const [base, inc] = tc.split('+').map(Number);
  try {
    const r = await NET.api('/api/room', { tc: { base, inc }, color: 'r' });
    S.inviteLink = r.link;
    joinRoom(r.id);
  } catch (e) { toast(t('Xona yaratib boʻlmadi: {e}', { e: e.message })); }
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
    if (st === 'reconnecting') toast(t('Aloqa uzildi, qayta ulanmoqda…'), 1500);
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
        openModal(`<h2>${t('Raqib durang taklif qildi')}</h2><p class="muted center">${t('Qabul qilsangiz, oʻyin durang bilan tugaydi.')}</p>
          <button class="btn primary" id="dYes">${t('Qabul qilish')}</button><button class="btn" id="dNo">${t('Rad etish')}</button>`);
        $('#dYes').onclick = () => { closeModal(); O.ws.send({ t: 'draw_accept' }); };
        $('#dNo').onclick = () => { closeModal(); O.ws.send({ t: 'draw_decline' }); };
      }
      return;
    case 'draw_declined': if (m.by !== O.room.you) toast(t('Raqib durangni rad etdi')); return;
    case 'rematch_offer':
      if (m.by !== O.room.you) { toast(t('Raqib revansh soʻrayapti'), 3000); const b = $('#oRematch'); if (b) b.textContent = t('Revanshni qabul qilish'); }
      return;
    case 'emoji': return floatEmoji(m.by, m.e);
    case 'error': toast(m.msg || t('Xatolik')); return;
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
    if (newGame && prev) { play('castle'); flashStatus(t('Yangi oʻyin'), 1200); }
  } else if (!same) {
    await scene.syncBoard(c.board());
  }
  afterPosition(true);
  S.busy = false;
  if (room.status === 'waiting') showWaiting(room);
  else if (!S.over && !$('#modal').classList.contains('hidden') && $('#modalCard').dataset.kind === 'waiting') { closeModal(); play('promote'); flashStatus(t('Oʻyin boshlandi!'), 1200); TG.haptic('success'); }
  if (!room.you && room.status !== 'waiting') toast(t('Siz bu oʻyinni tomosha qilyapsiz'), 2500);
  updateHUD();
}

function showWaiting(room) {
  const link = S.inviteLink || `https://t.me/${BOT_USERNAME}/play?startapp=r_${room.id}`;
  openModal(`<div class="result searching">${medallion('♞')}<h2>${t('Doʻstingiz kutilmoqda')}</h2>
    <p>${tcText(room.tc)} · ${t('Havolani doʻstingizga yuboring')}</p>
    <button class="btn primary" id="wShare">${icon('send', 20)}${t('Telegramda yuborish')}</button>
    <button class="btn" id="wCopy">${icon('link', 20)}${t('Havolani nusxalash')}</button>
    <button class="btn ghost" id="wLeave">${t('Bekor qilish')}</button></div>`);
  $('#modalCard').dataset.kind = 'waiting';
  $('#wShare').onclick = () => {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (tg && tg.switchInlineQuery) { try { tg.switchInlineQuery('r_' + room.id, ['users', 'groups']); return; } catch (e) { /* pastga */ } }
    if (tg && tg.openTelegramLink) tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(link) + '&text=' + encodeURIComponent(t('Keling, Shaxmat 3D da bir partiya oʻynaymiz')));
  };
  $('#wCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(link); toast(t('Havola nusxalandi')); } catch (e) { toast(link, 5000); }
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
  if (m.reason === 'checkmate') { flashStatus(t('Mat'), 1400); scene.checkmate(kingSquare(S.chess.turn()), winner); }
  else if (winner) scene.checkmate(kingSquare(winner === 'w' ? 'b' : 'w'), winner);
  else if (m.reason !== 'aborted') scene.drawEffect([kingSquare('w'), kingSquare('b')]);
  play(outcome === 'win' ? 'win' : outcome === 'loss' ? 'lose' : 'draw');
  TG.haptic(outcome === 'loss' ? 'error' : 'success');
  if (S.me && you && m.ratingDelta && m.ratingDelta[you] != null) S.me.rating += m.ratingDelta[you];
  await new Promise((res) => setTimeout(res, winner ? 1800 : 900));
  const d = you && m.ratingDelta ? m.ratingDelta[you] : null;
  const big = m.reason === 'aborted' ? '—' : m.result === '1-0' ? '1–0' : m.result === '0-1' ? '0–1' : '½–½';
  const title = m.reason === 'aborted' ? t('Bekor qilindi') : outcome === 'win' ? t('Gʻalaba!') : outcome === 'loss' ? t('Magʻlubiyat') : outcome === 'draw' ? t('Durang')
    : winner === 'w' ? t('Oq yutdi') : winner === 'b' ? t('Qora yutdi') : t('Durang');
  openModal(`<div class="result ${outcome}">${medallion(big)}<h2>${title}</h2><p>${OREASON[m.reason] || ''}</p>
    ${d != null ? `<p class="delta ${d >= 0 ? 'up' : 'down'}">${t('Reyting: {d}', { d: (d >= 0 ? '+' : '') + d + (S.me ? ' → ' + S.me.rating : '') })}</p>` : ''}
    ${you ? `<button class="btn primary" id="oRematch">${t('Revansh')}</button>` : ''}
    <button class="btn" id="oAn">${icon('chart', 20)}${t('Oʻyin tahlili')}</button><button class="btn" id="oShare">${icon('send', 20)}${t('Natijani ulashish')}</button>
    <button class="btn" id="oNew">${icon('globe', 20)}${t('Yangi raqib')}</button><button class="btn ghost" id="oHome">${t('Bosh menyu')}</button></div>`);
  const opp = you ? (you === 'w' ? r.black : r.white) : null;
  $('#oAn').onclick = () => analyzeGame();
  $('#oShare').onclick = () => shareResult(`${title} ${big}`, `${t('Onlayn')}${opp ? ' · ' + opp.name + ' (' + opp.rating + ')' : ''}${d != null ? ' · ' + t('reyting {d}', { d: (d >= 0 ? '+' : '') + d }) : ''}`);
  const rb = $('#oRematch');
  if (rb) rb.onclick = () => { O.ws.send({ t: 'rematch' }); rb.textContent = t('⏳ Raqib javobini kutish…'); rb.disabled = true; };
  $('#oNew').onclick = () => { goHome(); openOnline(); };
  $('#oHome').onclick = () => goHome();
}

function offerDraw() {
  const r = S.online && S.online.room;
  if (!r || S.over || !r.you || r.status !== 'playing') return;
  if (S.online.drawOffer === 'sent') return toast(t('Taklif yuborilgan'));
  S.online.drawOffer = 'sent';
  S.online.ws.send({ t: 'draw_offer' });
  toast(t('Durang taklifi yuborildi'));
}

function openEmoji() {
  const r = S.online && S.online.room;
  if (!r || !r.you) return;
  openModal(`<h2>${t('Emoji yuborish')}</h2><div class="promo" style="flex-wrap:wrap">${EMOJIS.map((e) => `<button data-e="${e}">${e}</button>`).join('')}</div>`);
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
  openModal(`<h2>${t('Reyting')}</h2><p class="muted center">${t('Yuklanmoqda…')}</p>`);
  try {
    const [top, me] = await Promise.all([NET.api('/api/top'), NET.api('/api/me')]);
    S.me = me;
    const medals = [];
    openModal(`<h2>${t('Reyting')}</h2><table class="stats"><tr><th>#</th><th>${t('Oʻyinchi')}</th><th>${t('Reyting')}</th><th>${t('Oʻyin')}</th></tr>
      ${top.slice(0, 50).map((u, i) => `<tr><td>${medals[i] || i + 1}</td><td style="text-align:left">${escapeHtml(u.name)}</td><td>${u.rating}</td><td>${u.games}</td></tr>`).join('') || `<tr><td colspan="4">${t('Hali reytingli oʻyinlar yoʻq')}</td></tr>`}</table>
      <p class="muted" style="text-align:center">${t('Siz: <b>{r}</b> · {w} gʻalaba · {l} magʻlubiyat · {d} durang', { r: me.rating, w: me.wins, l: me.losses, d: me.draws })}</p>
      <button class="btn primary" id="tPlay">${t('Reytingli oʻyin boshlash')}</button><button class="btn ghost" data-close>${t('Yopish')}</button>`);
    $('#tPlay').onclick = () => openOnline();
  } catch (e) { toast(t('Reytingni yuklab boʻlmadi')); closeModal(); }
}

function swatch(it) {
  if (it.type === 'theme') {
    const th = THEMES[it.key] || THEMES.klassik, c = (n) => '#' + n.toString(16).padStart(6, '0');
    return `<div class="sw" style="background:linear-gradient(90deg, ${c(th.light.color)} 0 50%, ${c(th.dark.color)} 50%);box-shadow:inset 0 -7px 0 ${c(th.frame)}"></div>`;
  }
  return `<div class="sw sw-ic">${icon({ effect: 'bolt', pro: 'hint', bundle: 'trophy' }[it.type] || 'bolt', 22)}</div>`;
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

// ───────────── modallar ─────────────
function openModal(html) {
  $('#modalCard').innerHTML = html;
  $('#modalCard').dataset.kind = '';
  $('#modalCard').classList.remove('short');
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
    openModal(`<h2>${t('Dona tanlang')}</h2><div class="promo">${['q', 'r', 'b', 'n'].map((p) => `<button data-p="${p}">${pieceIcon(p, color, 44)}</button>`).join('')}</div>
      <p class="muted" style="text-align:center">${t('Farzin · Rux · Fil · Ot')}</p>`);
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
    b.classList.add('stack');
    b.innerHTML = `${t(l.name)}<small>${s ? t('{w} gʻalaba, {l} magʻlubiyat', { w: s.w, l: s.l }) : t('hali oʻynalmagan')}</small>`;
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
      ${swatch(it)}<div class="nm">${t(it.name)}</div>
      <div class="pr">${have ? (sel ? t('Tanlangan') : t('Sizda bor')) : icon('lock', 13) + it.price + ' ⭐'}</div>
      <div class="acts">${preview ? `<button data-prev="${it.id}">${t('Koʻrish')}</button>` : ''}
      ${have ? (preview && !sel ? `<button data-use="${it.id}">${t('Tanlash')}</button>` : '') : `<button class="buy" data-buy="${it.id}">⭐ ${it.price}</button>`}</div></div>`;
  };
  const free = [{ id: 'free_theme', type: 'theme', key: 'klassik', name: THEMES.klassik.name, emoji: '🪵', free: true },
    { id: 'free_fx', type: 'effect', key: 'shatter', name: EFFECTS.shatter.name, emoji: '💥', free: true }];
  const all = [...free, ...ITEMS];
  const render = () => {
    const th = all.filter((i) => i.type === 'theme'), fx = all.filter((i) => i.type === 'effect');
    openModal(`<h2>${t('Doʻkon')}</h2>
      <div class="shop-sec">${t('Mavzular')}</div><div class="items">${th.map((i) => card(i, i.key === S.settings.theme, true)).join('')}</div>
      <div class="shop-sec">${t('Urish effektlari')}</div><div class="items">${fx.map((i) => card(i, i.key === S.settings.effect, true)).join('')}</div>
      <div class="shop-sec">${t('Imkoniyatlar')}</div><div class="items">${card(ITEMS.find((i) => i.id === 'pro'), false, false)}${card(ITEMS.find((i) => i.id === 'bundle_all'), false, false)}</div>
      <p class="muted" style="text-align:center">${t('Toʻlov Telegram Stars orqali. Xarid darhol ochiladi.')}</p>
      <button class="btn ghost" data-close>${t('Yopish')}</button>`);
    const card$ = $('#modalCard');
    card$.querySelectorAll('[data-prev]').forEach((b) => (b.onclick = () => {
      const it = all.find((i) => i.id === b.dataset.prev);
      if (it.type === 'theme') { scene.applyTheme(it.key); toast(t('{name} doskada koʻrsatildi', { name: t(it.name) })); }
      else { scene.setEffect(it.key); demoEffect(); toast(t('{name}: dona olinganda koʻrinadi', { name: t(it.name) })); }
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
  if (!TG.inTelegram) return toast(t('Xarid faqat Telegram ichida ishlaydi'));
  if (!url) return toast(t('Bu mahsulot tez orada sotuvga chiqadi'));
  const status = await TG.openInvoice(url);
  if (status === 'paid') {
    S.owned.add(it.id); saveOwned();
    toast(t('{name} ochildi. Rahmat!', { name: t(it.name) }));
    if (it.type === 'theme' || it.type === 'effect') use(it);
    updateHUD();
    if (rerender) rerender();
  } else if (status === 'failed') toast(t('Toʻlov amalga oshmadi'));
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
  openModal(`<h2>${t('Sozlamalar')}</h2>
    ${sw('sound', t('Ovoz'))}${sw('haptics', t('Tebranish'))}${sw('dots', t('Mumkin yurishlarni koʻrsatish'))}
    ${sw('view2D', t('Doskaga tepadan qarash'))}${sw('autoRotate', t('Bir telefonda: doskani navbatga qarab burish'))}${sw('coords', t('Koordinatalar'))}
    <div class="set"><span>${t('Grafika sifati')}</span><div class="seg">${[['low', 'Past'], ['mid', 'Oʻrta'], ['high', 'Yuqori']].map(([v, l]) => `<button data-q="${v}" class="${S.settings.quality === v ? 'on' : ''}">${t(l, { _ctx: 'quality' })}</button>`).join('')}</div></div>
    <div class="set"><span>Til / Язык</span><div class="seg">${[['uz', 'Oʻzbekcha'], ['ru', 'Русский']].map(([v, l]) => `<button data-lang="${v}" class="${LANG === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <button class="btn ghost" data-close>${t('Yopish')}</button>`);
  const c = $('#modalCard');
  c.querySelectorAll('.switch').forEach((b) => (b.onclick = () => {
    const k = b.dataset.k; S.settings[k] = !S.settings[k]; b.classList.toggle('on', S.settings[k]); applySettings(k); saveSettings(); play('click');
  }));
  c.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
    S.settings.quality = b.dataset.q; c.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b)); applySettings('quality'); saveSettings();
  }));
  c.querySelectorAll('[data-lang]').forEach((b) => (b.onclick = () => {
    if (b.dataset.lang === LANG) return;
    play('click');
    try { localStorage.setItem('s3d_lang', b.dataset.lang); } catch (e) { /* ignore */ }
    // ?lang= saqlangan tanlovdan ustun turadi — qayta yuklashdan oldin olib tashlaymiz
    const u = new URL(location.href);
    if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); history.replaceState(null, '', u.href); }
    location.reload();
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
  const streak = (S.stats.days || {}).streak || 0, solvedN = (S.stats.puzzle || {}).solved ? S.stats.puzzle.solved.length : 0;
  openModal(`<h2>${t('Natijalar')}</h2><table class="stats"><tr><th>${t('Rejim')}</th><th>${t('Gʻ')}</th><th>${t('M')}</th><th>${t('D')}</th></tr>
    ${LEVELS.map((l) => row(t(l.name), S.stats['l' + l.id])).join('')}
    ${row(t('Bir telefonda'), S.stats.friend ? { w: S.stats.friend.w, l: '–', d: S.stats.friend.d } : null)}</table>
    <p class="muted" style="text-align:center">${t('Gʻ — gʻalaba, M — magʻlubiyat, D — durang')}</p>
    <div class="streaks"><div><b>${streak}</b><small>${t('kun ketma-ket', { n: streak })}</small></div><div><b>${solvedN}</b><small>${t('masala yechildi', { n: solvedN })}</small></div><div><b>${Object.keys(S.stats.ach || {}).length}/${ACHIEVEMENTS.length}</b><small>${t('yutuq')}</small></div></div>
    <div class="shop-sec">${t('Yutuqlar')}</div>
    <div class="ach-grid">${ACHIEVEMENTS.map((a) => { const got = (S.stats.ach || {})[a.id]; return `<div class="ach ${got ? 'got' : ''}"><span class="ach-ic">${icon(got ? a.icon : 'lock', 20)}</span><b>${t(a.title)}</b><small>${t(a.desc)}</small></div>`; }).join('')}</div>
    <button class="btn ghost" data-close>${t('Yopish')}</button>`);
}

// ───────────── ishga tushirish ─────────────
async function init() {
  applyStatic(document);
  document.querySelectorAll('[data-ic]').forEach((el) => (el.innerHTML = icon(el.dataset.ic)));
  document.querySelectorAll('[data-medal]').forEach((el) => (el.innerHTML = medallion(el.dataset.medal, 74)));
  document.querySelectorAll('[data-logo]').forEach((el) => (el.innerHTML = knightLogo(+el.dataset.logo || 56)));
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
    const sp0 = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.start_param) || '';
    const refId = /^ref_(\d{1,16})$/.exec(sp0);
    NET.api('/api/me' + (refId ? '?ref=' + refId[1] : '')).then((me) => {
      S.me = me;
      for (const id of me.owned || []) S.owned.add(id);
      saveOwned();
      afterEvent();
    }).catch(() => {});
    NET.api('/api/invoices').then((inv) => { S.invoices = inv; }).catch(() => {});
    const tg = window.Telegram && window.Telegram.WebApp;
    const sp = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) || '';
    const qroom = new URLSearchParams(location.search).get('room');
    if (sp.startsWith('r_') || qroom) joinRoom(qroom || sp.slice(2));
    else if (sp === 'top') openTop();
  }
  if (new URLSearchParams(location.search).get('p') === 'tourney') openTourney();
  if (new URLSearchParams(location.search).get('p') === 'daily' || ((window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.start_param) || '') === 'daily') startPuzzle(puzzleNumber());
  $('#btnStartAI').onclick = () => {
    const c = S.settings.lastColor || 'r';
    saveSettings();
    S.saved = null;
    startGame('ai', S.settings.lastLevel ?? 1, c === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : c);
  };
  $('#btnFriend').onclick = () => { play('click'); S.saved = null; startGame('friend', 0, 'w'); };
  $('#btnPuzzle').onclick = () => { play('click'); openPuzzles(); };
  $('#btnRef').onclick = () => { play('click'); openInvite(); };
  $('#btnLessons').onclick = () => { play('click'); openLessons(); };
  updateHomeBadges();
  afterEvent();
  refreshOnline(); setInterval(refreshOnline, 60000);
  $('#btnShop').onclick = () => { play('click'); openShop(); };
  $('#btnSettings').onclick = () => { play('click'); openSettings(); };
  $('#btnStats').onclick = () => { play('click'); openStats(); };
  $('#tUndo').onclick = doUndo;
  $('#tHint').onclick = doHint;
  $('#tResign').onclick = doResign;
  $('#tView').onclick = () => { S.settings.view2D = !S.settings.view2D; applySettings('view2D'); saveSettings(); play('click'); };
  $('#tMenu').onclick = () => {
    openModal(`<h2>${t('Menyu')}</h2><button class="btn" id="mNew">${t('Yangi oʻyin')}</button><button class="btn" id="mShop">${icon('bag', 20)}${t('Doʻkon')}</button>
      <button class="btn" id="mSet">${icon('gear', 20)}${t('Sozlamalar')}</button><button class="btn" id="mHome">${t('Bosh menyu')}</button><button class="btn ghost" data-close>${t('Yopish')}</button>`);
    $('#mNew').onclick = () => (S.mode === 'task' ? taskRestart() : startGame(S.mode, S.level, S.player));
    $('#mShop').onclick = () => openShop();
    $('#mSet').onclick = () => openSettings();
    $('#mHome').onclick = () => goHome();
  };
  // birinchi teginishda audio kontekstni uygʻotamiz
  window.addEventListener('pointerdown', () => play('none'), { once: true });
  window.__s3d = { S, scene, resultCard, startBotGame }; // test uchun
}

init().catch((e) => {
  console.error(e);
  const l = $('#loading'); if (l) l.querySelector('p').textContent = t('Xatolik: {e}', { e: e.message });
});
