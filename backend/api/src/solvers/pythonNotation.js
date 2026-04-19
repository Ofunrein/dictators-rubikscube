/**
 * pythonNotation.js — Translates between our notation and the Python solver's notation
 *
 * Our simulator and the vendored Python NxN solver use different naming conventions
 * for both STICKERS and MOVES. This file handles all the translation.
 *
 * STICKER NOTATION:
 *   We use colors:  W (white), R (red), G (green), Y (yellow), O (orange), B (blue)
 *   Solver uses faces: U (up), R (right), F (front), D (down), L (left), B (back)
 *   Same cube, different labels.
 *
 * MOVE NOTATION:
 *   We use lowercase for 4x4 inner slices:  r, l, u, d, f, b
 *   Solver uses prefix notation:             2R, 2L, 2U, 2D, 2F, 2B
 *   Solver also has "wide" moves:            Rw = R + r together
 *
 * Separated from pythonNxNSolver.js so you can understand the notation mapping
 * without wading through virtualenv bootstrap code.
 */

import { FACE_ORDER, getFaceSize, isSupportedMove } from '../cube.js';

// Sticker color tokens → solver face tokens
const TOKEN_TO_SOLVER = {
  W: 'U',
  R: 'R',
  G: 'F',
  Y: 'D',
  O: 'L',
  B: 'B',
};

// Solver face tokens → our sticker color tokens (reverse direction)
const SOLVER_TO_TOKEN = {
  U: 'W',
  R: 'R',
  F: 'G',
  D: 'Y',
  L: 'O',
  B: 'B',
};

// Our inner-slice notation → solver inner-slice notation
// We use lowercase: r = inner right layer on 4x4
// Solver uses prefix: 2R = same thing
const CANONICAL_INNER_TO_SOLVER = {
  u: '2U',
  d: '2D',
  r: '2R',
  l: '2L',
  f: '2F',
  b: '2B',
};

// Solver wide-turn notation → our canonical moves
// Solver's "Rw" (wide R) = our "R" + "r" (outer + inner right layers together)
const SOLVER_WIDE_TO_CANONICAL = {
  Uw: ['U', 'u'],
  Dw: ['D', 'd'],
  Rw: ['R', 'r'],
  Lw: ['L', 'l'],
  Fw: ['F', 'f'],
  Bw: ['B', 'b'],
};

// Solver inner-slice notation → our canonical moves
const SOLVER_INNER_TO_CANONICAL = {
  '2U': ['u'],
  '2D': ['d'],
  '2R': ['r'],
  '2L': ['l'],
  '2F': ['f'],
  '2B': ['b'],
};

// Helper to iterate through face rows for remapping.
function mapRows(stickers, size, transform) {
  const mapped = [];
  for (let row = 0; row < size; row += 1) {
    const rowStart = row * size;
    mapped.push(...transform(stickers.slice(rowStart, rowStart + size), row));
  }
  return mapped;
}

// The vendored NxN solver stores U and D rows in the opposite vertical order
// from the simulator/frontend model, so flip those rows when crossing the boundary.
function remapFaceForSolver(face, stickers, size) {
  if (face !== 'U' && face !== 'D') {
    return stickers;
  }

  return mapRows(stickers, size, (_, row) => {
    const sourceRow = size - 1 - row;
    const start = sourceRow * size;
    return stickers.slice(start, start + size);
  });
}

// Same transformation in reverse (it's symmetric — flipping twice gets you back)
function remapFaceFromSolver(face, stickers, size) {
  return remapFaceForSolver(face, stickers, size);
}

// Converts our object-based cube state into the flat string the Python solver expects.
// Output: one long string like "UUUUUUUUURRRRRRRRR..." in solver notation.
export function flattenStateForSolver(state) {
  const size = getFaceSize(state);

  return FACE_ORDER.map((face) => {
    const stickers = remapFaceForSolver(face, state[face], size);
    return stickers.map((token) => TOKEN_TO_SOLVER[token]).join('');
  }).join('');
}

// Converts the Python solver's flat string output back into our state object.
export function unflattenStateFromSolver(flat, size) {
  const stickerCount = size * size;
  const state = {};

  for (let index = 0; index < FACE_ORDER.length; index += 1) {
    const face = FACE_ORDER[index];
    const start = index * stickerCount;
    const stickers = flat
      .slice(start, start + stickerCount)
      .split('')
      .map((token) => SOLVER_TO_TOKEN[token]);
    state[face] = remapFaceFromSolver(face, stickers, size);
  }

  return state;
}

// Splits a move string into [base, suffix] — e.g. "R'" → ["R", "'"], "R2" → ["R", "2"]
function splitMoveSuffix(move) {
  if (move.endsWith('2')) {
    return [move.slice(0, -1), '2'];
  }
  if (move.endsWith("'")) {
    return [move.slice(0, -1), "'"];
  }
  return [move, ''];
}

function appendSuffix(baseMove, suffix) {
  return suffix ? `${baseMove}${suffix}` : baseMove;
}

// Translates a single solver move into our canonical notation.
// For example: solver's "Rw'" → our ["R'", "r'"], solver's "2R" → our ["r"]
function normalizeSolverMove(move, size) {
  const token = move?.trim();
  if (!token) {
    return [];
  }

  // If it's already in our notation, pass it through
  if (isSupportedMove(token, size)) {
    return [token];
  }

  const [baseMove, suffix] = splitMoveSuffix(token);

  // Wide turns become outer + inner (e.g. Rw → R + r)
  if (size === 4 && SOLVER_WIDE_TO_CANONICAL[baseMove]) {
    return SOLVER_WIDE_TO_CANONICAL[baseMove].map((canonicalMove) => appendSuffix(canonicalMove, suffix));
  }

  // Inner slice notation (e.g. 2R → r)
  if (size === 4 && SOLVER_INNER_TO_CANONICAL[baseMove]) {
    return SOLVER_INNER_TO_CANONICAL[baseMove].map((canonicalMove) => appendSuffix(canonicalMove, suffix));
  }

  throw new Error(`Unsupported ${size}x${size} solver move: ${token}`);
}

// Translates an entire solver move sequence into our canonical notation.
export function normalizeSolverMoves(rawMoves, size) {
  return rawMoves.flatMap((move) => normalizeSolverMove(move, size));
}

// Translates one of our canonical moves into solver notation.
// Used when sending moves TO the Python solver (the apply mode).
export function convertCanonicalMoveToSolver(move, size) {
  const token = move?.trim();
  if (!token) {
    throw new Error('Move cannot be empty.');
  }

  const [baseMove, suffix] = splitMoveSuffix(token);

  // Our lowercase inner-slice → solver's prefix notation (e.g. r → 2R)
  if (size === 4 && CANONICAL_INNER_TO_SOLVER[baseMove]) {
    return appendSuffix(CANONICAL_INNER_TO_SOLVER[baseMove], suffix);
  }

  return token;
}
