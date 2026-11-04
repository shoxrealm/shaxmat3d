// engine.js — dependency-free ES module for browsers and Node 20+.
//
// Board: 0x88 mailbox, a1 = 0, h8 = 119.
// Pieces: positive = White, negative = Black; P/N/B/R/Q/K = 1..6.
// Scores: centipawns from the side-to-move perspective.
// Search repetition history starts at the supplied FEN.
//
// Moves and all per-node working storage use integers / typed arrays.
// The transposition table is private to each search and has a fixed size.

const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;

const CAPTURE = 1 << 17;
const EN_PASSANT = 1 << 18;
const CASTLING = 1 << 19;
const DOUBLE_PUSH = 1 << 20;

const WHITE_KING = 1;
const WHITE_QUEEN = 2;
const BLACK_KING = 4;
const BLACK_QUEEN = 8;

const INF = 32767;
const MATE = 32000;
const MATE_THRESHOLD = 31000;
const MAX_EVAL = 28000;
const MAX_PLY = 256;

// This also accommodates unusually crowded, composed FEN positions.
const MOVE_CAPACITY = 2048;
const UNDO_STRIDE = 10;
const INITIAL_STACK_CAPACITY = MAX_PLY + 8;

const TT_SIZE = 1 << 18;
const TT_MASK = TT_SIZE - 1;
const TT_EXACT = 1;
const TT_LOWER = 2;
const TT_UPPER = 3;

const KNIGHT_STEPS = new Int8Array([
  -33, -31, -18, -14, 14, 18, 31, 33,
]);
const BISHOP_STEPS = new Int8Array([-17, -15, 15, 17]);
const ROOK_STEPS = new Int8Array([-16, -1, 1, 16]);
const KING_STEPS = new Int8Array([-17, -16, -15, -1, 1, 15, 16, 17]);

const MG_VALUE = new Int16Array([0, 100, 320, 335, 500, 950, 0]);
const EG_VALUE = new Int16Array([0, 120, 305, 330, 520, 930, 0]);
const PHASE_VALUE = new Int8Array([0, 0, 1, 1, 2, 4, 0]);
const PASSED_BONUS = new Int16Array([0, 0, 8, 18, 35, 60, 100, 0]);

const PIECE_NAMES = " PNBRQK";
const PROMOTION_NAMES = ["", "", "n", "b", "r", "q", ""];
const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const NOW =
  typeof globalThis.performance?.now === "function"
    ? () => globalThis.performance.now()
    : () => Date.now();

const CASTLE_MASK = new Uint8Array(128);
CASTLE_MASK.fill(15);
CASTLE_MASK[0] = 15 ^ WHITE_QUEEN;
CASTLE_MASK[4] = 15 ^ (WHITE_KING | WHITE_QUEEN);
CASTLE_MASK[7] = 15 ^ WHITE_KING;
CASTLE_MASK[112] = 15 ^ BLACK_QUEEN;
CASTLE_MASK[116] = 15 ^ (BLACK_KING | BLACK_QUEEN);
CASTLE_MASK[119] = 15 ^ BLACK_KING;

// Formula-generated piece-square tables, indexed from White's perspective.
// Generating these once keeps evaluation itself entirely table-based.
const MG_PST = new Int16Array(7 * 128);
const EG_PST = new Int16Array(7 * 128);

for (let rank = 0; rank < 8; rank++) {
  for (let file = 0; file < 8; file++) {
    const square = rank * 16 + file;
    const center =
      7 - (Math.abs(2 * file - 7) + Math.abs(2 * rank - 7)) / 2;
    const fileCenter = 3.5 - Math.abs(file - 3.5);

    MG_PST[PAWN * 128 + square] = rank * 7 + fileCenter * 5;
    EG_PST[PAWN * 128 + square] = rank * 12 + fileCenter * 3;

    MG_PST[KNIGHT * 128 + square] =
      center * 12 - (rank === 0 ? 12 : 0);
    EG_PST[KNIGHT * 128 + square] = center * 9;

    MG_PST[BISHOP * 128 + square] =
      center * 6 + (rank > 0 && rank < 7 ? 5 : 0);
    EG_PST[BISHOP * 128 + square] = center * 6;

    MG_PST[ROOK * 128 + square] =
      fileCenter * 2 + (rank === 6 ? 20 : 0);
    EG_PST[ROOK * 128 + square] = center * 3 + rank * 2;

    MG_PST[QUEEN * 128 + square] = center * 3 - rank * 2;
    EG_PST[QUEEN * 128 + square] = center * 5;

    MG_PST[KING * 128 + square] =
      -center * 10 -
      rank * 8 +
      (rank === 0 && (file === 2 || file === 6) ? 24 : 0);
    EG_PST[KING * 128 + square] = center * 12;
  }
}

// Deterministic 64-bit Zobrist keys represented by two signed 32-bit words.
// No BigInt arithmetic is needed in the search.
let randomState = 0x9e3779b9 | 0;

function random32() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return randomState | 0;
}

function randomKeys(length) {
  const keys = new Int32Array(length);
  for (let i = 0; i < length; i++) keys[i] = random32();
  return keys;
}

const Z_PIECE_LO = randomKeys(12 * 128);
const Z_PIECE_HI = randomKeys(12 * 128);
const Z_CASTLE_LO = randomKeys(16);
const Z_CASTLE_HI = randomKeys(16);
const Z_EP_LO = randomKeys(8);
const Z_EP_HI = randomKeys(8);
const Z_SIDE_LO = random32();
const Z_SIDE_HI = random32();

function pieceKeyIndex(piece, square) {
  return (piece > 0 ? piece - 1 : 5 - piece) * 128 + square;
}

function squareName(square) {
  return (
    String.fromCharCode(97 + (square & 7)) +
    String.fromCharCode(49 + (square >> 4))
  );
}

function parseSquare(name) {
  if (!/^[a-h][1-8]$/.test(name)) {
    throw new Error(`Invalid square: ${name}`);
  }
  return (name.charCodeAt(1) - 49) * 16 + name.charCodeAt(0) - 97;
}

function encodeMove(from, to, promotion = 0, flags = 0) {
  return from | (to << 7) | (promotion << 14) | flags;
}

function moveToUCI(move) {
  return (
    squareName(move & 127) +
    squareName((move >>> 7) & 127) +
    PROMOTION_NAMES[(move >>> 14) & 7]
  );
}

function attacked(pos, square, bySide) {
  const board = pos.board;
  const pawnBase = square - bySide * 16;

  let from = pawnBase - 1;
  if (!(from & 0x88) && board[from] === bySide * PAWN) return true;
  from = pawnBase + 1;
  if (!(from & 0x88) && board[from] === bySide * PAWN) return true;

  for (let i = 0; i < KNIGHT_STEPS.length; i++) {
    from = square + KNIGHT_STEPS[i];
    if (!(from & 0x88) && board[from] === bySide * KNIGHT) return true;
  }

  for (let i = 0; i < KING_STEPS.length; i++) {
    from = square + KING_STEPS[i];
    if (!(from & 0x88) && board[from] === bySide * KING) return true;
  }

  for (let i = 0; i < BISHOP_STEPS.length; i++) {
    const step = BISHOP_STEPS[i];
    for (from = square + step; !(from & 0x88); from += step) {
      const piece = board[from];
      if (!piece) continue;
      if (piece === bySide * BISHOP || piece === bySide * QUEEN) {
        return true;
      }
      break;
    }
  }

  for (let i = 0; i < ROOK_STEPS.length; i++) {
    const step = ROOK_STEPS[i];
    for (from = square + step; !(from & 0x88); from += step) {
      const piece = board[from];
      if (!piece) continue;
      if (piece === bySide * ROOK || piece === bySide * QUEEN) {
        return true;
      }
      break;
    }
  }

  return false;
}

function sideInCheck(pos) {
  return attacked(pos, pos.kings[pos.side === 1 ? 0 : 1], -pos.side);
}

// Repetition identity includes en passant only when a legal EP capture exists.
// In particular, a pinned pawn does not make an EP square hash-relevant.
function legalEPFile(pos) {
  const ep = pos.ep;
  if (ep < 0 || pos.board[ep] !== 0) return -1;

  const side = pos.side;
  const board = pos.board;
  const capturedSquare = ep - side * 16;
  if (board[capturedSquare] !== -side * PAWN) return -1;

  const king = pos.kings[side === 1 ? 0 : 1];

  for (let delta = -1; delta <= 1; delta += 2) {
    const from = capturedSquare + delta;
    if ((from & 0x88) || board[from] !== side * PAWN) continue;

    board[from] = 0;
    board[capturedSquare] = 0;
    board[ep] = side * PAWN;

    const legal = !attacked(pos, king, -side);

    board[from] = side * PAWN;
    board[capturedSquare] = -side * PAWN;
    board[ep] = 0;

    if (legal) return ep & 7;
  }

  return -1;
}

function initializeHash(pos) {
  let lo = Z_CASTLE_LO[pos.castling];
  let hi = Z_CASTLE_HI[pos.castling];

  if (pos.side === -1) {
    lo ^= Z_SIDE_LO;
    hi ^= Z_SIDE_HI;
  }

  for (let square = 0; square < 128; square++) {
    if (square & 0x88) {
      square += 7;
      continue;
    }
    const piece = pos.board[square];
    if (!piece) continue;
    const index = pieceKeyIndex(piece, square);
    lo ^= Z_PIECE_LO[index];
    hi ^= Z_PIECE_HI[index];
  }

  pos.epFile = legalEPFile(pos);
  if (pos.epFile >= 0) {
    lo ^= Z_EP_LO[pos.epFile];
    hi ^= Z_EP_HI[pos.epFile];
  }

  pos.hashLo = lo | 0;
  pos.hashHi = hi | 0;
  pos.repLo = pos.hashLo;
  pos.repHi = pos.hashHi;
  pos.hashHistory[0] = pos.hashLo;
  pos.hashHistory[1] = pos.hashHi;
}

/**
 * Parse a six-field FEN. "startpos" is also accepted.
 *
 * The returned mutable position includes internal undo/hash storage.
 * Use parseFEN(toFEN(pos)) to obtain an independent copy.
 */
export function parseFEN(fen) {
  if (typeof fen !== "string") throw new TypeError("FEN must be a string");
  if (fen.trim() === "startpos") fen = START_FEN;

  const fields = fen.trim().split(/\s+/);
  if (fields.length !== 6) throw new Error("FEN must contain six fields");

  const board = new Int8Array(128);
  const kings = new Int16Array([-1, -1]);
  const ranks = fields[0].split("/");
  if (ranks.length !== 8) throw new Error("FEN must contain eight ranks");

  for (let row = 0; row < 8; row++) {
    let file = 0;
    for (const character of ranks[row]) {
      if (character >= "1" && character <= "8") {
        file += character.charCodeAt(0) - 48;
        if (file > 8) throw new Error("Invalid FEN rank");
        continue;
      }

      const upper = character.toUpperCase();
      const type = PIECE_NAMES.indexOf(upper);
      if (type < PAWN || file >= 8) throw new Error("Invalid FEN piece");

      const side = character === upper ? 1 : -1;
      const square = (7 - row) * 16 + file++;
      board[square] = side * type;

      if (type === KING) {
        const color = side === 1 ? 0 : 1;
        if (kings[color] !== -1) throw new Error("Duplicate king in FEN");
        kings[color] = square;
      }
    }
    if (file !== 8) throw new Error("Invalid FEN rank width");
  }

  if (kings[0] < 0 || kings[1] < 0) {
    throw new Error("FEN must contain one king of each color");
  }
  if (fields[1] !== "w" && fields[1] !== "b") {
    throw new Error("Invalid FEN side to move");
  }

  const side = fields[1] === "w" ? 1 : -1;
  let castling = 0;

  if (fields[2] !== "-") {
    if (!/^[KQkq]+$/.test(fields[2])) {
      throw new Error("Invalid FEN castling rights");
    }
    for (const character of fields[2]) {
      const bit =
        character === "K"
          ? WHITE_KING
          : character === "Q"
            ? WHITE_QUEEN
            : character === "k"
              ? BLACK_KING
              : BLACK_QUEEN;
      if (castling & bit) throw new Error("Duplicate FEN castling right");
      castling |= bit;
    }
  }

  const ep = fields[3] === "-" ? -1 : parseSquare(fields[3]);
  if (ep >= 0 && (ep >> 4) !== (side === 1 ? 5 : 2)) {
    throw new Error("Invalid FEN en passant rank");
  }

  if (!/^\d+$/.test(fields[4]) || !/^\d+$/.test(fields[5])) {
    throw new Error("Invalid FEN move counters");
  }

  const halfmove = Number(fields[4]);
  const fullmove = Number(fields[5]);
  if (
    !Number.isSafeInteger(halfmove) ||
    !Number.isSafeInteger(fullmove) ||
    halfmove < 0 ||
    fullmove < 1
  ) {
    throw new Error("Invalid FEN move counters");
  }

  const pos = {
    board,
    kings,
    side,
    castling,
    ep,
    halfmove,
    fullmove,
    epFile: -1,
    hashLo: 0,
    hashHi: 0,
    repLo: 0,
    repHi: 0,
    sp: 0,
    // Float64 preserves large FEN counters; keys are still 32-bit integers.
    undo: new Float64Array(INITIAL_STACK_CAPACITY * UNDO_STRIDE),
    hashHistory: new Int32Array((INITIAL_STACK_CAPACITY + 1) * 2),
  };

  initializeHash(pos);
  return pos;
}

/** Serialize a position returned by parseFEN. */
export function toFEN(pos) {
  const rows = [];

  for (let rank = 7; rank >= 0; rank--) {
    let row = "";
    let empty = 0;

    for (let file = 0; file < 8; file++) {
      const piece = pos.board[rank * 16 + file];
      if (!piece) {
        empty++;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      const name = PIECE_NAMES[Math.abs(piece)];
      row += piece > 0 ? name : name.toLowerCase();
    }

    if (empty) row += empty;
    rows.push(row);
  }

  let rights = "";
  if (pos.castling & WHITE_KING) rights += "K";
  if (pos.castling & WHITE_QUEEN) rights += "Q";
  if (pos.castling & BLACK_KING) rights += "k";
  if (pos.castling & BLACK_QUEEN) rights += "q";

  return [
    rows.join("/"),
    pos.side === 1 ? "w" : "b",
    rights || "-",
    pos.ep < 0 ? "-" : squareName(pos.ep),
    pos.halfmove,
    pos.fullmove,
  ].join(" ");
}

function ensureStack(pos) {
  if ((pos.sp + 1) * UNDO_STRIDE <= pos.undo.length) return;

  const undo = new Float64Array(pos.undo.length * 2);
  undo.set(pos.undo);
  pos.undo = undo;

  const history = new Int32Array((undo.length / UNDO_STRIDE + 1) * 2);
  history.set(pos.hashHistory);
  pos.hashHistory = history;
}

function makeMove(pos, move) {
  ensureStack(pos);

  const board = pos.board;
  const side = pos.side;
  const from = move & 127;
  const to = (move >>> 7) & 127;
  const promotion = (move >>> 14) & 7;
  const moving = board[from];
  const capturedSquare = move & EN_PASSANT ? to - side * 16 : to;
  const captured = board[capturedSquare];
  const oldRights = pos.castling;

  const undo = pos.undo;
  const u = pos.sp * UNDO_STRIDE;
  undo[u] = move;
  undo[u + 1] = captured;
  undo[u + 2] = oldRights;
  undo[u + 3] = pos.ep;
  undo[u + 4] = pos.halfmove;
  undo[u + 5] = pos.epFile;
  undo[u + 6] = pos.hashLo;
  undo[u + 7] = pos.hashHi;
  undo[u + 8] = pos.repLo;
  undo[u + 9] = pos.repHi;

  let lo = pos.hashLo ^ Z_SIDE_LO ^ Z_CASTLE_LO[oldRights];
  let hi = pos.hashHi ^ Z_SIDE_HI ^ Z_CASTLE_HI[oldRights];

  if (pos.epFile >= 0) {
    lo ^= Z_EP_LO[pos.epFile];
    hi ^= Z_EP_HI[pos.epFile];
  }

  let index = pieceKeyIndex(moving, from);
  lo ^= Z_PIECE_LO[index];
  hi ^= Z_PIECE_HI[index];

  if (captured) {
    index = pieceKeyIndex(captured, capturedSquare);
    lo ^= Z_PIECE_LO[index];
    hi ^= Z_PIECE_HI[index];
  }

  board[from] = 0;
  board[capturedSquare] = 0;
  const arriving = promotion ? side * promotion : moving;
  board[to] = arriving;

  index = pieceKeyIndex(arriving, to);
  lo ^= Z_PIECE_LO[index];
  hi ^= Z_PIECE_HI[index];

  if (Math.abs(moving) === KING) {
    pos.kings[side === 1 ? 0 : 1] = to;
  }

  if (move & CASTLING) {
    const rookFrom = to > from ? from + 3 : from - 4;
    const rookTo = to > from ? from + 1 : from - 1;
    const rook = side * ROOK;

    board[rookFrom] = 0;
    board[rookTo] = rook;

    const a = pieceKeyIndex(rook, rookFrom);
    const b = pieceKeyIndex(rook, rookTo);
    lo ^= Z_PIECE_LO[a] ^ Z_PIECE_LO[b];
    hi ^= Z_PIECE_HI[a] ^ Z_PIECE_HI[b];
  }

  pos.castling = oldRights & CASTLE_MASK[from] & CASTLE_MASK[to];
  lo ^= Z_CASTLE_LO[pos.castling];
  hi ^= Z_CASTLE_HI[pos.castling];

  pos.ep = move & DOUBLE_PUSH ? from + side * 16 : -1;
  const irreversible = Math.abs(moving) === PAWN || captured !== 0;
  pos.halfmove = irreversible ? 0 : pos.halfmove + 1;
  if (side === -1) pos.fullmove++;
  pos.side = -side;

  pos.epFile = pos.ep < 0 ? -1 : legalEPFile(pos);
  if (pos.epFile >= 0) {
    lo ^= Z_EP_LO[pos.epFile];
    hi ^= Z_EP_HI[pos.epFile];
  }

  pos.hashLo = lo | 0;
  pos.hashHi = hi | 0;

  // Reversible-history fingerprints prevent TT score reuse across different
  // repetition contexts. Move ordering can still use any matching board key.
  if (irreversible || pos.castling !== oldRights) {
    pos.repLo = pos.hashLo;
    pos.repHi = pos.hashHi;
  } else {
    pos.repLo = (pos.repLo + pos.hashLo) | 0;
    pos.repHi = (pos.repHi + pos.hashHi) | 0;
  }

  pos.sp++;
  pos.hashHistory[pos.sp * 2] = pos.hashLo;
  pos.hashHistory[pos.sp * 2 + 1] = pos.hashHi;
}

function unmakeMove(pos) {
  const u = --pos.sp * UNDO_STRIDE;
  const undo = pos.undo;
  const move = undo[u];
  const from = move & 127;
  const to = (move >>> 7) & 127;
  const promotion = (move >>> 14) & 7;
  const side = -pos.side;
  const board = pos.board;
  const moving = promotion ? side * PAWN : board[to];

  pos.side = side;
  if (side === -1) pos.fullmove--;

  board[from] = moving;
  board[to] = 0;

  if (move & EN_PASSANT) {
    board[to - side * 16] = undo[u + 1];
  } else {
    board[to] = undo[u + 1];
  }

  if (Math.abs(moving) === KING) {
    pos.kings[side === 1 ? 0 : 1] = from;
  }

  if (move & CASTLING) {
    const rookFrom = to > from ? from + 3 : from - 4;
    const rookTo = to > from ? from + 1 : from - 1;
    board[rookFrom] = side * ROOK;
    board[rookTo] = 0;
  }

  pos.castling = undo[u + 2];
  pos.ep = undo[u + 3];
  pos.halfmove = undo[u + 4];
  pos.epFile = undo[u + 5];
  pos.hashLo = undo[u + 6];
  pos.hashHi = undo[u + 7];
  pos.repLo = undo[u + 8];
  pos.repHi = undo[u + 9];
}

function madeMoveIsLegal(pos) {
  // The previous mover is now the opposite of pos.side.
  return !attacked(
    pos,
    pos.kings[pos.side === 1 ? 1 : 0],
    pos.side,
  );
}

function addPromotions(buffer, index, move) {
  buffer[index++] = move | (QUEEN << 14);
  buffer[index++] = move | (ROOK << 14);
  buffer[index++] = move | (BISHOP << 14);
  buffer[index++] = move | (KNIGHT << 14);
  return index;
}

// Generate pseudo-legal moves. King safety is checked after makeMove.
// Tactical generation includes every capture and every promotion.
function generateMoves(pos, buffer, offset, tactical = false) {
  const board = pos.board;
  const side = pos.side;
  let end = offset;

  for (let from = 0; from < 128; from++) {
    if (from & 0x88) {
      from += 7;
      continue;
    }

    const piece = board[from];
    if (piece * side <= 0) continue;
    const type = Math.abs(piece);

    if (type === PAWN) {
      const step = side * 16;
      let to = from + step;

      if (!(to & 0x88) && board[to] === 0) {
        const lastRank = (to >> 4) === (side === 1 ? 7 : 0);
        if (lastRank) {
          end = addPromotions(buffer, end, encodeMove(from, to));
        } else if (!tactical) {
          buffer[end++] = encodeMove(from, to);
          if (
            (from >> 4) === (side === 1 ? 1 : 6) &&
            board[to + step] === 0
          ) {
            buffer[end++] = encodeMove(from, to + step, 0, DOUBLE_PUSH);
          }
        }
      }

      for (let delta = -1; delta <= 1; delta += 2) {
        to = from + step + delta;
        if (to & 0x88) continue;

        const target = board[to];
        if (target * side < 0 && Math.abs(target) !== KING) {
          const move = encodeMove(from, to, 0, CAPTURE);
          if ((to >> 4) === (side === 1 ? 7 : 0)) {
            end = addPromotions(buffer, end, move);
          } else {
            buffer[end++] = move;
          }
        } else if (
          to === pos.ep &&
          target === 0 &&
          board[to - step] === -side * PAWN
        ) {
          buffer[end++] = encodeMove(from, to, 0, CAPTURE | EN_PASSANT);
        }
      }
      continue;
    }

    const directions =
      type === KNIGHT
        ? KNIGHT_STEPS
        : type === BISHOP
          ? BISHOP_STEPS
          : type === ROOK
            ? ROOK_STEPS
            : KING_STEPS;
    const sliding = type === BISHOP || type === ROOK || type === QUEEN;

    for (let d = 0; d < directions.length; d++) {
      const step = directions[d];
      for (let to = from + step; !(to & 0x88); to += step) {
        const target = board[to];

        if (target) {
          if (target * side < 0 && Math.abs(target) !== KING) {
            buffer[end++] = encodeMove(from, to, 0, CAPTURE);
          }
          break;
        }

        if (!tactical) buffer[end++] = encodeMove(from, to);
        if (!sliding) break;
      }
    }

    if (type !== KING || tactical) continue;

    const home = side === 1 ? 4 : 116;
    if (from !== home || attacked(pos, home, -side)) continue;

    const kingRight = side === 1 ? WHITE_KING : BLACK_KING;
    const queenRight = side === 1 ? WHITE_QUEEN : BLACK_QUEEN;

    if (
      (pos.castling & kingRight) &&
      board[home + 3] === side * ROOK &&
      board[home + 1] === 0 &&
      board[home + 2] === 0 &&
      !attacked(pos, home + 1, -side) &&
      !attacked(pos, home + 2, -side)
    ) {
      buffer[end++] = encodeMove(home, home + 2, 0, CASTLING);
    }

    if (
      (pos.castling & queenRight) &&
      board[home - 4] === side * ROOK &&
      board[home - 1] === 0 &&
      board[home - 2] === 0 &&
      board[home - 3] === 0 &&
      !attacked(pos, home - 1, -side) &&
      !attacked(pos, home - 2, -side)
    ) {
      buffer[end++] = encodeMove(home, home - 2, 0, CASTLING);
    }
  }

  return end - offset;
}

function hasLegalMove(pos, scratch) {
  const count = generateMoves(pos, scratch, 0);
  for (let i = 0; i < count; i++) {
    makeMove(pos, scratch[i]);
    const legal = madeMoveIsLegal(pos);
    unmakeMove(pos);
    if (legal) return true;
  }
  return false;
}

/** Return all fully legal moves as UCI strings. */
export function legalMovesUCI(fen) {
  const pos = parseFEN(fen);
  const buffer = new Int32Array(MOVE_CAPACITY);
  const count = generateMoves(pos, buffer, 0);
  const result = [];

  for (let i = 0; i < count; i++) {
    const move = buffer[i];
    makeMove(pos, move);
    const legal = madeMoveIsLegal(pos);
    unmakeMove(pos);
    if (legal) result.push(moveToUCI(move));
  }

  return result;
}

function perftRecursive(pos, depth, ply, buffer) {
  if (depth === 0) return 1;

  const offset = ply * MOVE_CAPACITY;
  const count = generateMoves(pos, buffer, offset);
  let nodes = 0;

  for (let i = 0; i < count; i++) {
    makeMove(pos, buffer[offset + i]);
    if (madeMoveIsLegal(pos)) {
      nodes +=
        depth === 1 ? 1 : perftRecursive(pos, depth - 1, ply + 1, buffer);
    }
    unmakeMove(pos);
  }

  return nodes;
}

/**
 * Count legal leaf positions. Draw rules do not stop perft.
 * The result is a Number; very large counts can exceed its exact integer range.
 */
export function perft(fen, depth) {
  if (!Number.isSafeInteger(depth) || depth < 0) {
    throw new RangeError("depth must be a nonnegative integer");
  }
  const pos = parseFEN(fen);
  if (depth === 0) return 1;
  const buffer = new Int32Array(depth * MOVE_CAPACITY);
  return perftRecursive(pos, depth, 0, buffer);
}

function insufficientMaterial(pos) {
  let knights = 0;
  let bishops = 0;
  let bishopColor = -1;
  let mixedBishopColors = false;

  for (let square = 0; square < 128; square++) {
    if (square & 0x88) {
      square += 7;
      continue;
    }

    const type = Math.abs(pos.board[square]);
    if (!type || type === KING) continue;
    if (type === PAWN || type === ROOK || type === QUEEN) return false;

    if (type === KNIGHT) {
      knights++;
    } else {
      bishops++;
      const color = ((square >> 4) + (square & 7)) & 1;
      if (bishopColor < 0) bishopColor = color;
      else if (bishopColor !== color) mixedBishopColors = true;
    }
  }

  if (knights + bishops <= 1) return true;
  return knights === 0 && !mixedBishopColors;
}

function sameRepetitionPosition(a, b) {
  if (
    a.hashLo !== b.hashLo ||
    a.hashHi !== b.hashHi ||
    a.side !== b.side ||
    a.castling !== b.castling ||
    a.epFile !== b.epFile
  ) {
    return false;
  }

  // Avoid making public game adjudication depend solely on a hash match.
  for (let square = 0; square < 128; square++) {
    if (square & 0x88) {
      square += 7;
      continue;
    }
    if (a.board[square] !== b.board[square]) return false;
  }
  return true;
}

/**
 * historyFens is the chronological list of previous positions.
 * It may alternatively include the current position as its final entry;
 * an identical final six-field FEN is counted only once.
 *
 * Threefold and the 50-move rule are treated as adjudicated draws.
 */
export function gameStatus(fen, historyFens = []) {
  const pos = parseFEN(fen);
  const inCheck = sideInCheck(pos);
  const scratch = new Int32Array(MOVE_CAPACITY);

  if (!hasLegalMove(pos, scratch)) {
    return {
      over: true,
      result: inCheck ? (pos.side === 1 ? "0-1" : "1-0") : "1/2-1/2",
      reason: inCheck ? "checkmate" : "stalemate",
      inCheck,
    };
  }

  const currentFEN = toFEN(pos);
  let occurrences = 1;

  for (let i = 0; i < historyFens.length; i++) {
    const previous = parseFEN(historyFens[i]);
    if (
      i === historyFens.length - 1 &&
      toFEN(previous) === currentFEN
    ) {
      continue;
    }
    if (sameRepetitionPosition(pos, previous)) occurrences++;
  }

  let reason = null;
  if (occurrences >= 3) reason = "threefold";
  else if (pos.halfmove >= 100) reason = "fifty";
  else if (insufficientMaterial(pos)) reason = "insufficient";

  return {
    over: reason !== null,
    result: reason === null ? null : "1/2-1/2",
    reason,
    inCheck,
  };
}

function mobility(board, square, type, side) {
  const directions =
    type === KNIGHT
      ? KNIGHT_STEPS
      : type === BISHOP
        ? BISHOP_STEPS
        : type === ROOK
          ? ROOK_STEPS
          : KING_STEPS;
  const sliding = type !== KNIGHT;
  let count = 0;

  for (let d = 0; d < directions.length; d++) {
    const step = directions[d];
    for (let to = square + step; !(to & 0x88); to += step) {
      const target = board[to];
      if (target * side > 0) break;
      count++;
      if (target || !sliding) break;
    }
  }

  return count;
}

function evaluate(pos, pawnCounts, pawnMasks) {
  const board = pos.board;
  pawnCounts.fill(0);
  pawnMasks.fill(0);

  let mg = 0;
  let eg = 0;
  let phase = 0;
  let whiteBishops = 0;
  let blackBishops = 0;
  let knights = 0;
  let bishops = 0;
  let bishopColor = -1;
  let mixedBishopColors = false;
  let hasPawnOrMajor = false;

  for (let square = 0; square < 128; square++) {
    if (square & 0x88) {
      square += 7;
      continue;
    }

    const piece = board[square];
    if (!piece) continue;

    const side = piece > 0 ? 1 : -1;
    const type = Math.abs(piece);
    const relative = side === 1 ? square : square ^ 112;
    const pst = type * 128 + relative;

    mg += side * (MG_VALUE[type] + MG_PST[pst]);
    eg += side * (EG_VALUE[type] + EG_PST[pst]);
    phase += PHASE_VALUE[type];

    if (type === PAWN) {
      const index = (side === 1 ? 0 : 8) + (square & 7);
      pawnCounts[index]++;
      pawnMasks[index] |= 1 << (square >> 4);
      hasPawnOrMajor = true;
    } else if (type !== KING) {
      if (type === KNIGHT) {
        knights++;
      } else if (type === BISHOP) {
        bishops++;
        if (side === 1) whiteBishops++;
        else blackBishops++;

        const color = ((square >> 4) + (square & 7)) & 1;
        if (bishopColor < 0) bishopColor = color;
        else if (bishopColor !== color) mixedBishopColors = true;
      } else {
        hasPawnOrMajor = true;
      }

      const moves = mobility(board, square, type, side);
      const mgWeight = type === KNIGHT || type === BISHOP ? 3 : 1;
      const egWeight = type === QUEEN ? 1 : 2;
      mg += side * moves * mgWeight;
      eg += side * moves * egWeight;
    }
  }

  if (
    !hasPawnOrMajor &&
    (knights + bishops <= 1 || (knights === 0 && !mixedBishopColors))
  ) {
    return 0;
  }

  if (whiteBishops >= 2) {
    mg += 30;
    eg += 45;
  }
  if (blackBishops >= 2) {
    mg -= 30;
    eg -= 45;
  }

  for (let color = 0; color < 2; color++) {
    const side = color === 0 ? 1 : -1;
    const base = color * 8;

    for (let file = 0; file < 8; file++) {
      const count = pawnCounts[base + file];
      if (!count) continue;

      if (count > 1) {
        mg -= side * (count - 1) * 12;
        eg -= side * (count - 1) * 18;
      }

      const left = file > 0 ? pawnCounts[base + file - 1] : 0;
      const right = file < 7 ? pawnCounts[base + file + 1] : 0;
      if (!left && !right) {
        mg -= side * count * 10;
        eg -= side * count * 12;
      }
    }

    const king = pos.kings[color];
    const kingFile = king & 7;
    const step = side * 16;

    for (let delta = -1; delta <= 1; delta++) {
      const file = kingFile + delta;
      if (file < 0 || file > 7) continue;

      const first = king + step + delta;
      const second = king + step * 2 + delta;

      if (!(first & 0x88) && board[first] === side * PAWN) {
        mg += side * 10;
      } else if (!(second & 0x88) && board[second] === side * PAWN) {
        mg += side * 4;
      } else {
        mg -= side * 8;
      }

      if (!pawnCounts[base + file]) mg -= side * 8;
    }
  }

  for (let square = 0; square < 128; square++) {
    if (square & 0x88) {
      square += 7;
      continue;
    }

    const piece = board[square];
    if (Math.abs(piece) !== PAWN) continue;

    const side = piece > 0 ? 1 : -1;
    const file = square & 7;
    const rank = square >> 4;
    const enemyBase = side === 1 ? 8 : 0;

    let enemies = pawnMasks[enemyBase + file];
    if (file > 0) enemies |= pawnMasks[enemyBase + file - 1];
    if (file < 7) enemies |= pawnMasks[enemyBase + file + 1];

    const ahead = side === 1 ? (0xff << (rank + 1)) & 0xff : (1 << rank) - 1;
    if (!(enemies & ahead)) {
      const advance = side === 1 ? rank : 7 - rank;
      const bonus = PASSED_BONUS[advance];
      mg += side * Math.floor(bonus / 2);
      eg += side * bonus;
    }
  }

  phase = Math.min(24, phase);
  const tapered = Math.round((mg * phase + eg * (24 - phase)) / 24);
  return Math.max(-MAX_EVAL, Math.min(MAX_EVAL, tapered * pos.side + 8));
}

function repetitionDraw(pos) {
  let occurrences = 1;
  const earliest = Math.max(0, pos.sp - pos.halfmove);

  for (let i = pos.sp - 2; i >= earliest; i -= 2) {
    if (
      pos.hashHistory[i * 2] === pos.hashLo &&
      pos.hashHistory[i * 2 + 1] === pos.hashHi
    ) {
      if (++occurrences >= 3) return true;
    }
  }
  return false;
}

function createSearchContext(pos, deadline, rootCount) {
  return {
    pos,
    deadline,
    stopped: false,
    nodes: 0,

    moves: new Int32Array(MAX_PLY * MOVE_CAPACITY),
    order: new Int32Array(MAX_PLY * MOVE_CAPACITY),
    scratch: new Int32Array(MOVE_CAPACITY),

    killers: new Int32Array(MAX_PLY * 2),
    history: new Int32Array(2 * 128 * 128),
    previousPV: new Int32Array(MAX_PLY),
    pv: new Int32Array(MAX_PLY * MAX_PLY),
    pvLength: new Uint16Array(MAX_PLY),

    rootScores: new Int32Array(rootCount),
    rootPV: new Int32Array(rootCount * MAX_PLY),
    rootPVLength: new Uint16Array(rootCount),

    pawnCounts: new Uint8Array(16),
    pawnMasks: new Uint8Array(16),

    ttLo: new Int32Array(TT_SIZE),
    ttHi: new Int32Array(TT_SIZE),
    ttRepLo: new Int32Array(TT_SIZE),
    ttRepHi: new Int32Array(TT_SIZE),
    ttMove: new Int32Array(TT_SIZE),
    ttScore: new Int32Array(TT_SIZE),
    ttDepth: new Int16Array(TT_SIZE),
    ttHalfmove: new Uint8Array(TT_SIZE),
    ttFlag: new Uint8Array(TT_SIZE),
  };
}

function visitNode(ctx) {
  ctx.nodes++;
  if ((ctx.nodes & 2047) === 0 && NOW() >= ctx.deadline) {
    ctx.stopped = true;
  }
  return ctx.stopped;
}

function staticEvaluation(ctx) {
  return evaluate(ctx.pos, ctx.pawnCounts, ctx.pawnMasks);
}

function tacticalOrder(pos, move) {
  const from = move & 127;
  const to = (move >>> 7) & 127;
  const promotion = (move >>> 14) & 7;
  let score = 0;

  if (move & CAPTURE) {
    const victim = move & EN_PASSANT ? PAWN : Math.abs(pos.board[to]);
    const attacker = Math.abs(pos.board[from]);
    score = 1000000 + MG_VALUE[victim] * 16 - MG_VALUE[attacker];
  }

  if (promotion) score += 1500000 + MG_VALUE[promotion];
  return score;
}

function orderMoves(ctx, ply, count, ttMove) {
  const pos = ctx.pos;
  const offset = ply * MOVE_CAPACITY;
  const pvMove = ctx.previousPV[ply];
  const historyBase = pos.side === 1 ? 0 : 128 * 128;

  for (let i = 0; i < count; i++) {
    const move = ctx.moves[offset + i];
    let score;

    if (move === pvMove) {
      score = 2000000000;
    } else if (move === ttMove) {
      score = 1900000000;
    } else if ((move & CAPTURE) || ((move >>> 14) & 7)) {
      score = tacticalOrder(pos, move);
    } else if (move === ctx.killers[ply * 2]) {
      score = 900000;
    } else if (move === ctx.killers[ply * 2 + 1]) {
      score = 800000;
    } else {
      const from = move & 127;
      const to = (move >>> 7) & 127;
      score = ctx.history[historyBase + from * 128 + to];
    }

    ctx.order[offset + i] = score;
  }
}

function selectMove(ctx, offset, index, count) {
  let best = index;
  for (let j = index + 1; j < count; j++) {
    if (ctx.order[offset + j] > ctx.order[offset + best]) best = j;
  }

  if (best !== index) {
    let value = ctx.moves[offset + index];
    ctx.moves[offset + index] = ctx.moves[offset + best];
    ctx.moves[offset + best] = value;

    value = ctx.order[offset + index];
    ctx.order[offset + index] = ctx.order[offset + best];
    ctx.order[offset + best] = value;
  }

  return ctx.moves[offset + index];
}

function updatePV(ctx, ply, move) {
  const base = ply * MAX_PLY;
  ctx.pv[base + ply] = move;

  const childLength = ctx.pvLength[ply + 1];
  const childBase = (ply + 1) * MAX_PLY;
  for (let i = ply + 1; i < childLength; i++) {
    ctx.pv[base + i] = ctx.pv[childBase + i];
  }

  ctx.pvLength[ply] = Math.max(ply + 1, childLength);
}

function rewardQuietCutoff(ctx, ply, move, depth) {
  if ((move & CAPTURE) || ((move >>> 14) & 7)) return;

  const killerIndex = ply * 2;
  if (ctx.killers[killerIndex] !== move) {
    ctx.killers[killerIndex + 1] = ctx.killers[killerIndex];
    ctx.killers[killerIndex] = move;
  }

  const from = move & 127;
  const to = (move >>> 7) & 127;
  const index = (ctx.pos.side === 1 ? 0 : 128 * 128) + from * 128 + to;
  const bonus = Math.min(16384, depth * depth);
  const old = ctx.history[index];
  ctx.history[index] = old + bonus - Math.floor((old * bonus) / 32768);
}

function scoreToTT(score, ply) {
  if (score > MATE_THRESHOLD) return score + ply;
  if (score < -MATE_THRESHOLD) return score - ply;
  return score;
}

function scoreFromTT(score, ply) {
  if (score > MATE_THRESHOLD) return score - ply;
  if (score < -MATE_THRESHOLD) return score + ply;
  return score;
}

function storeTT(ctx, depth, ply, score, flag, move) {
  const pos = ctx.pos;
  const index = pos.hashLo & TT_MASK;
  const same =
    ctx.ttFlag[index] !== 0 &&
    ctx.ttLo[index] === pos.hashLo &&
    ctx.ttHi[index] === pos.hashHi &&
    ctx.ttRepLo[index] === pos.repLo &&
    ctx.ttRepHi[index] === pos.repHi &&
    ctx.ttHalfmove[index] === pos.halfmove;

  if (same && ctx.ttDepth[index] > depth && flag !== TT_EXACT) return;

  ctx.ttLo[index] = pos.hashLo;
  ctx.ttHi[index] = pos.hashHi;
  ctx.ttRepLo[index] = pos.repLo;
  ctx.ttRepHi[index] = pos.repHi;
  ctx.ttHalfmove[index] = pos.halfmove;
  ctx.ttDepth[index] = depth;
  ctx.ttScore[index] = scoreToTT(score, ply);
  ctx.ttMove[index] = move;
  ctx.ttFlag[index] = flag;
}

// Checkmate takes precedence over a draw reached on the same move.
function adjudicateSearchDraw(ctx, inCheck, ply) {
  if (inCheck && !hasLegalMove(ctx.pos, ctx.scratch)) return -MATE + ply;
  return 0;
}

function quiescence(ctx, alpha, beta, ply) {
  ctx.pvLength[ply] = ply;
  if (visitNode(ctx)) return 0;

  const pos = ctx.pos;
  const inCheck = sideInCheck(pos);

  if (pos.halfmove >= 100 || repetitionDraw(pos)) {
    return adjudicateSearchDraw(ctx, inCheck, ply);
  }

  if (ply >= MAX_PLY - 1) {
    if (!hasLegalMove(pos, ctx.scratch)) return inCheck ? -MATE + ply : 0;
    return staticEvaluation(ctx);
  }

  let best = -INF;

  if (!inCheck) {
    best = staticEvaluation(ctx);

    if (best >= beta) {
      // Stand pat must not turn a stalemate into a nonzero evaluation.
      return hasLegalMove(pos, ctx.scratch) ? best : 0;
    }

    if (best > alpha) alpha = best;
  }

  const offset = ply * MOVE_CAPACITY;
  const count = generateMoves(pos, ctx.moves, offset, !inCheck);
  orderMoves(ctx, ply, count, 0);
  let legal = 0;

  for (let i = 0; i < count; i++) {
    const move = selectMove(ctx, offset, i, count);
    makeMove(pos, move);

    if (!madeMoveIsLegal(pos)) {
      unmakeMove(pos);
      continue;
    }

    legal++;
    const score = -quiescence(ctx, -beta, -alpha, ply + 1);
    unmakeMove(pos);

    if (ctx.stopped) return 0;
    if (score > best) best = score;

    if (score > alpha) {
      alpha = score;
      updatePV(ctx, ply, move);
    }

    if (alpha >= beta) return best;
  }

  if (legal === 0) {
    if (inCheck) return -MATE + ply;
    if (!hasLegalMove(pos, ctx.scratch)) return 0;
  }

  return best;
}

function negamax(ctx, depth, alpha, beta, ply) {
  if (depth <= 0) return quiescence(ctx, alpha, beta, ply);

  ctx.pvLength[ply] = ply;
  if (visitNode(ctx)) return 0;

  const pos = ctx.pos;
  const inCheck = sideInCheck(pos);

  if (pos.halfmove >= 100 || repetitionDraw(pos)) {
    return adjudicateSearchDraw(ctx, inCheck, ply);
  }

  if (ply >= MAX_PLY - 1) {
    if (!hasLegalMove(pos, ctx.scratch)) return inCheck ? -MATE + ply : 0;
    return staticEvaluation(ctx);
  }

  if (inCheck) depth++;

  const originalAlpha = alpha;
  const ttIndex = pos.hashLo & TT_MASK;
  let ttMove = 0;

  if (
    ctx.ttFlag[ttIndex] &&
    ctx.ttLo[ttIndex] === pos.hashLo &&
    ctx.ttHi[ttIndex] === pos.hashHi
  ) {
    ttMove = ctx.ttMove[ttIndex];

    if (
      ctx.ttDepth[ttIndex] >= depth &&
      ctx.ttHalfmove[ttIndex] === pos.halfmove &&
      ctx.ttRepLo[ttIndex] === pos.repLo &&
      ctx.ttRepHi[ttIndex] === pos.repHi
    ) {
      const score = scoreFromTT(ctx.ttScore[ttIndex], ply);
      const flag = ctx.ttFlag[ttIndex];

      if (
        flag === TT_EXACT ||
        (flag === TT_LOWER && score >= beta) ||
        (flag === TT_UPPER && score <= alpha)
      ) {
        return score;
      }
    }
  }

  const offset = ply * MOVE_CAPACITY;
  const count = generateMoves(pos, ctx.moves, offset);
  orderMoves(ctx, ply, count, ttMove);

  let best = -INF;
  let bestMove = 0;
  let legal = 0;

  for (let i = 0; i < count; i++) {
    const move = selectMove(ctx, offset, i, count);
    makeMove(pos, move);

    if (!madeMoveIsLegal(pos)) {
      unmakeMove(pos);
      continue;
    }

    legal++;
    const score = -negamax(ctx, depth - 1, -beta, -alpha, ply + 1);
    unmakeMove(pos);

    if (ctx.stopped) return 0;

    if (score > best) {
      best = score;
      bestMove = move;
    }

    if (score > alpha) {
      alpha = score;
      updatePV(ctx, ply, move);
    }

    if (alpha >= beta) {
      rewardQuietCutoff(ctx, ply, move, depth);
      break;
    }
  }

  if (legal === 0) best = inCheck ? -MATE + ply : 0;

  const flag =
    best <= originalAlpha ? TT_UPPER : best >= beta ? TT_LOWER : TT_EXACT;
  storeTT(ctx, depth, ply, best, flag, bestMove);

  return best;
}

function rootPVStrings(ctx, index) {
  const result = [];
  const base = index * MAX_PLY;
  const length = ctx.rootPVLength[index];
  for (let i = 0; i < length; i++) {
    result.push(moveToUCI(ctx.rootPV[base + i]));
  }
  return result;
}

/**
 * Iterative-deepening negamax with alpha-beta, quiescence, check extensions,
 * PV/TT/MVV-LVA ordering, killers, history, and mate-distance scoring.
 *
 * `depth` is the last fully completed iteration. An interrupted first
 * iteration returns depth 0 with a legal fallback and a static root score.
 * TT hits can shorten the returned PV.
 *
 * Time is sampled every 2048 searched nodes and at root move boundaries.
 * JavaScript scheduling and the sampling interval can cause a small overrun.
 *
 * With randomness > 0, every root move receives a full-window score, and a
 * uniformly random move within the requested margin is selected. The returned
 * score belongs to that selected move. Nominal search depth is then capped at 2.
 */
export function search(
  fen,
  { timeMs = 1000, maxDepth = 64, randomness = 0 } = {},
) {
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    throw new RangeError("timeMs must be a finite nonnegative number");
  }
  if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) {
    throw new RangeError("maxDepth must be a nonnegative integer");
  }
  if (!Number.isFinite(randomness)) {
    throw new RangeError("randomness must be finite");
  }

  randomness = Math.max(0, Math.min(300, randomness));
  maxDepth = Math.min(maxDepth, MAX_PLY - 2);
  if (randomness > 0) maxDepth = Math.min(maxDepth, 2);

  const deadline = NOW() + timeMs;
  const pos = parseFEN(fen);
  const rootInCheck = sideInCheck(pos);
  const rootMoves = new Int32Array(MOVE_CAPACITY);
  const pseudoCount = generateMoves(pos, rootMoves, 0);
  let rootCount = 0;

  // Establish a legal fallback before consulting the deadline.
  for (let i = 0; i < pseudoCount; i++) {
    const move = rootMoves[i];
    makeMove(pos, move);
    const legal = madeMoveIsLegal(pos);
    unmakeMove(pos);
    if (legal) rootMoves[rootCount++] = move;
  }

  if (rootCount === 0) {
    return {
      move: null,
      score: rootInCheck ? -MATE : 0,
      depth: 0,
      nodes: 0,
      pv: [],
    };
  }

  let fallback = rootMoves[0];
  let fallbackOrder = tacticalOrder(pos, fallback);
  for (let i = 1; i < rootCount; i++) {
    const value = tacticalOrder(pos, rootMoves[i]);
    if (value > fallbackOrder) {
      fallback = rootMoves[i];
      fallbackOrder = value;
    }
  }

  const fallbackUCI = moveToUCI(fallback);

  if (pos.halfmove >= 100 || insufficientMaterial(pos)) {
    return {
      move: fallbackUCI,
      score: 0,
      depth: 0,
      nodes: 0,
      pv: [fallbackUCI],
    };
  }

  let resultMove = fallbackUCI;
  let resultScore = evaluate(pos, new Uint8Array(16), new Uint8Array(16));
  let resultDepth = 0;
  let resultPV = [fallbackUCI];

  if (maxDepth === 0 || NOW() >= deadline) {
    return {
      move: resultMove,
      score: resultScore,
      depth: 0,
      nodes: 0,
      pv: resultPV,
    };
  }

  const ctx = createSearchContext(pos, deadline, rootCount);
  ctx.moves.set(rootMoves.subarray(0, rootCount), 0);
  ctx.previousPV[0] = fallback;

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (NOW() >= deadline) break;

    ctx.nodes++;
    orderMoves(ctx, 0, rootCount, 0);

    let alpha = -INF;
    let bestScore = -INF;
    let bestIndex = 0;
    let completed = true;
    const effectiveDepth = depth + (rootInCheck ? 1 : 0);

    for (let i = 0; i < rootCount; i++) {
      if (NOW() >= deadline) {
        ctx.stopped = true;
        completed = false;
        break;
      }

      const move = selectMove(ctx, 0, i, rootCount);
      makeMove(pos, move);

      const score =
        randomness > 0
          ? -negamax(ctx, effectiveDepth - 1, -INF, INF, 1)
          : -negamax(ctx, effectiveDepth - 1, -INF, -alpha, 1);

      unmakeMove(pos);

      if (ctx.stopped) {
        completed = false;
        break;
      }

      ctx.rootScores[i] = score;

      const pvBase = i * MAX_PLY;
      ctx.rootPV[pvBase] = move;
      const childLength = ctx.pvLength[1];
      for (let p = 1; p < childLength; p++) {
        ctx.rootPV[pvBase + p] = ctx.pv[MAX_PLY + p];
      }
      ctx.rootPVLength[i] = Math.max(1, childLength);

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
      if (score > alpha) alpha = score;
    }

    if (!completed) break;

    // Ordering follows the best line, independently of weak-level selection.
    ctx.previousPV.fill(0);
    const bestPVBase = bestIndex * MAX_PLY;
    const bestPVLength = ctx.rootPVLength[bestIndex];
    for (let p = 0; p < bestPVLength; p++) {
      ctx.previousPV[p] = ctx.rootPV[bestPVBase + p];
    }

    let selected = bestIndex;
    if (randomness > 0) {
      let eligible = 0;
      for (let i = 0; i < rootCount; i++) {
        if (ctx.rootScores[i] >= bestScore - randomness) {
          eligible++;
          if (Math.random() < 1 / eligible) selected = i;
        }
      }
    }

    resultMove = moveToUCI(ctx.moves[selected]);
    resultScore = ctx.rootScores[selected];
    resultDepth = depth;
    resultPV = rootPVStrings(ctx, selected);

    if (
      randomness === 0 &&
      Math.abs(bestScore) > MATE_THRESHOLD &&
      MATE - Math.abs(bestScore) <= depth
    ) {
      break;
    }
  }

  return {
    move: resultMove,
    score: resultScore,
    depth: resultDepth,
    nodes: ctx.nodes,
    pv: resultPV,
  };
}
