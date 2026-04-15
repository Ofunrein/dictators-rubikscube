import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const apiSrcDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(apiSrcDir, '../../..');
const frontendMovesCandidates = [
  resolve(repoRoot, 'dictators-website/src/cube/moves.js'),
  resolve(repoRoot, 'dicators-website/src/cube/moves.js'),
];

let frontendMovesModule = null;
for (const candidate of frontendMovesCandidates) {
  if (!existsSync(candidate)) continue;
  frontendMovesModule = await import(pathToFileURL(candidate).href);
  break;
}

if (!frontendMovesModule) {
  throw new Error(
    `Unable to find frontend moves module. Checked: ${frontendMovesCandidates.join(', ')}`,
  );
}

const { applyMove: applyFrontendMove, MOVES: FRONTEND_MOVES } = frontendMovesModule;

export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];
export const STICKER_TOKENS = ['W', 'R', 'G', 'Y', 'O', 'B'];
export const MOVE_TOKENS = [...FRONTEND_MOVES];
export const SCRAMBLE_MOVE_TOKENS = MOVE_TOKENS.filter((move) => !/^[MESxyz]/.test(move));

const FACE_SET = new Set(FACE_ORDER);
const TOKEN_SET = new Set(STICKER_TOKENS);
const MOVE_SET = new Set(MOVE_TOKENS);

export function isSupportedMove(move) {
  return typeof move === 'string' && MOVE_SET.has(move);
}

export function isStickerToken(value) {
  return typeof value === 'string' && TOKEN_SET.has(value);
}

export function isCubeFace(face) {
  return typeof face === 'string' && FACE_SET.has(face);
}

export function createSolvedState() {
  return {
    U: Array(9).fill('W'),
    R: Array(9).fill('R'),
    F: Array(9).fill('G'),
    D: Array(9).fill('Y'),
    L: Array(9).fill('O'),
    B: Array(9).fill('B')
  };
}

export function cloneCubeState(state) {
  return FACE_ORDER.reduce((acc, face) => {
    acc[face] = [...state[face]];
    return acc;
  }, {});
}

export function applyMoveToState(state, move) {
  return applyFrontendMove(cloneCubeState(state), move);
}

export function applyMoves(initialState, moves) {
  return moves.reduce((state, move) => applyMoveToState(state, move), cloneCubeState(initialState));
}

export function getMoveFace(move) {
  return move.replace("'", '');
}

function createSeededRng(seed) {
  let current = seed >>> 0;
  return () => {
    current = (1664525 * current + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

export function generateScramble(length = 25, seed) {
  const random = Number.isInteger(seed) ? createSeededRng(seed) : Math.random;
  const scramble = [];

  while (scramble.length < length) {
    const next = SCRAMBLE_MOVE_TOKENS[Math.floor(random() * SCRAMBLE_MOVE_TOKENS.length)];
    if (scramble.length === 0) {
      scramble.push(next);
      continue;
    }

    const prev = scramble[scramble.length - 1];
    if (getMoveFace(prev) === getMoveFace(next)) {
      continue;
    }

    scramble.push(next);
  }

  return scramble;
}
