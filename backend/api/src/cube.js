/**
 * cube.js — Backend wrapper around the shared frontend cube model
 *
 * Instead of duplicating the cube logic, the backend imports it directly from
 * the frontend source tree (frontend/src/cube/). That way there's only
 * ONE move engine and ONE state format for the whole project.
 *
 * Why the import discovery pattern below:
 *   The backend doesn't use a bundler like Vite, so it can't do normal
 *   relative imports across project boundaries. Instead, it finds the frontend
 *   files by walking up from its own directory to the repo root, then looking
 *   for the frontend cube modules by absolute path. The candidate list includes
 *   a common typo path as a safety net (typo happened early in development).
 *
 * What this file exports:
 *   All the same cube helpers the frontend uses (createSolvedState, applyMove, etc.)
 *   plus a few backend-only extras like generateScramble() with seed support and
 *   getScrambleMoveTokens() for filtering which moves can appear in scrambles.
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Walk up from this file's directory to find the repo root.
// import.meta.url gives us the file:// URL of this module (an ES modules thing).
const apiSrcDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(apiSrcDir, '../../..');

// Try multiple candidate paths for the frontend modules.
// The second entry in each list is a typo fallback from earlier development.
const frontendCubeModelCandidates = [
  resolve(repoRoot, 'frontend/src/cube/cubeModel.js'),
  resolve(repoRoot, 'dicators-website/src/cube/cubeModel.js'),
];

const frontendMovesCandidates = [
  resolve(repoRoot, 'frontend/src/cube/moves.js'),
  resolve(repoRoot, 'dicators-website/src/cube/moves.js'),
];

const frontendUtilsCandidates = [
  resolve(repoRoot, 'frontend/src/utils/isPlainObject.js'),
];

// Dynamic import: try each candidate path until one exists.
// pathToFileURL is needed because dynamic import() wants a URL, not a file path.
let frontendCubeModelModule = null;
for (const candidate of frontendCubeModelCandidates) {
  if (!existsSync(candidate)) continue;
  frontendCubeModelModule = await import(pathToFileURL(candidate).href);
  break;
}

if (!frontendCubeModelModule) {
  throw new Error(
    `Unable to find frontend cube model module. Checked: ${frontendCubeModelCandidates.join(', ')}`,
  );
}

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

let frontendUtilsModule = null;
for (const candidate of frontendUtilsCandidates) {
  if (!existsSync(candidate)) continue;
  frontendUtilsModule = await import(pathToFileURL(candidate).href);
  break;
}

if (!frontendUtilsModule) {
  throw new Error(
    `Unable to find frontend utils module. Checked: ${frontendUtilsCandidates.join(', ')}`,
  );
}

const {
  FACE_ORDER,
  STICKER_TOKENS,
  SUPPORTED_CUBE_SIZES,
  cloneCubeState: cloneSharedCubeState,
  collectCubeStateDetails,
  createSolvedState: createSharedSolvedState,
  getFaceSize,
  normalizeCubeSize,
} = frontendCubeModelModule;

const {
  applyMove: applyFrontendMove,
  applyMoves: applyFrontendMoves,
  getSupportedMoves,
} = frontendMovesModule;

const { isPlainObject } = frontendUtilsModule;

const FACE_SET = new Set(FACE_ORDER);
const TOKEN_SET = new Set(STICKER_TOKENS);

const DEFAULT_SCRAMBLE_LENGTHS = {
  2: 14,
  3: 25,
  4: 40,
};

// Simple seeded random number generator (linear congruential).
// When you pass a seed to the scramble endpoint, this makes the scramble
// reproducible — the same seed always generates the same sequence.
// The >>> 0 ensures the number stays in unsigned 32-bit range.
function createSeededRng(seed) {
  let current = seed >>> 0;
  return () => {
    current = (1664525 * current + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

export {
  FACE_ORDER,
  STICKER_TOKENS,
  SUPPORTED_CUBE_SIZES,
  collectCubeStateDetails,
  getFaceSize,
  isPlainObject,
  normalizeCubeSize,
};

export const MOVE_TOKENS = [...getSupportedMoves(3)];

export function getSupportedMoveTokens(size = 3) {
  return getSupportedMoves(normalizeCubeSize(size));
}

export function getScrambleMoveTokens(size = 3) {
  const normalizedSize = normalizeCubeSize(size);
  const pattern = normalizedSize === 4
    ? /^[URFDLBurfdlb](2|')?$/
    : /^[URFDLB](2|')?$/;
  return getSupportedMoves(normalizedSize).filter((move) => pattern.test(move));
}

export function getDefaultScrambleLength(size = 3) {
  return DEFAULT_SCRAMBLE_LENGTHS[normalizeCubeSize(size)] ?? 25;
}

export function isSupportedMove(move, size = 3) {
  return typeof move === 'string' && getSupportedMoveTokens(size).includes(move.trim());
}

export function isStickerToken(value) {
  return typeof value === 'string' && TOKEN_SET.has(value);
}

export function isCubeFace(face) {
  return typeof face === 'string' && FACE_SET.has(face);
}

export function createSolvedState(size = 3) {
  return createSharedSolvedState(size);
}

export function cloneCubeState(state) {
  return cloneSharedCubeState(state);
}

export function applyMoveToState(state, move) {
  return applyFrontendMove(cloneSharedCubeState(state), move);
}

export function applyMoves(initialState, moves) {
  return applyFrontendMoves(initialState, moves);
}

export function getMoveFace(move) {
  return move.replace(/['2]/g, '').toUpperCase();
}

export function generateScramble(length = 25, seed, size = 3) {
  const normalizedSize = normalizeCubeSize(size);
  const safeLength = Number.isInteger(length) ? length : getDefaultScrambleLength(normalizedSize);
  const random = Number.isInteger(seed) ? createSeededRng(seed) : Math.random;
  const tokens = getScrambleMoveTokens(normalizedSize);
  const scramble = [];

  while (scramble.length < safeLength) {
    const next = tokens[Math.floor(random() * tokens.length)];

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
