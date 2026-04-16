import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FACE_ORDER, cloneCubeState } from './cube.js';

const require = createRequire(import.meta.url);
const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '..', '..', '..');
const solverFactory = require(resolve(repoRoot, 'api', 'solver.js'));
const TOKEN_TO_FACE = {
  W: 'U',
  R: 'R',
  G: 'F',
  Y: 'D',
  O: 'L',
  B: 'B'
};

let solverModulePromise = null;

function getSolverModule() {
  if (!solverModulePromise) {
    // The compiled solver bundle is expensive to bootstrap, so keep one shared
    // module instance alive for every solve request handled by this process.
    solverModulePromise = Promise.resolve(solverFactory({}));
  }
  return solverModulePromise;
}

function flattenState(state) {
  // Eric's bridge expects the six faces in FACE_ORDER as one 54-character string.
  return FACE_ORDER.map((face) => state[face].join('')).join('');
}

function unflattenState(flat) {
  const state = {};
  for (let index = 0; index < FACE_ORDER.length; index += 1) {
    const face = FACE_ORDER[index];
    state[face] = flat.slice(index * 9, index * 9 + 9).split('');
  }
  return state;
}

function isUniformFace(stickers) {
  return Array.isArray(stickers) && stickers.length === 9 && stickers.every((sticker) => sticker === stickers[0]);
}

function normalizeSolvedOrientation(state) {
  const normalized = {};

  for (const sourceFace of FACE_ORDER) {
    const stickers = state[sourceFace];
    if (!isUniformFace(stickers)) {
      throw new Error(`WASM solver returned a non-uniform ${sourceFace} face.`);
    }

    const canonicalFace = TOKEN_TO_FACE[stickers[4]];
    if (!canonicalFace) {
      throw new Error(`WASM solver returned an unknown center token: ${stickers[4]}`);
    }

    // The C++ solver can hand back the solved cube in its own color/token orientation.
    // Re-keying by center sticker keeps the frontend state in the U/R/F/D/L/B shape it
    // already uses everywhere else.
    normalized[canonicalFace] = [...stickers];
  }

  for (const face of FACE_ORDER) {
    if (!normalized[face]) {
      throw new Error(`WASM solver did not return a face for ${face}.`);
    }
  }

  return normalized;
}

export async function solveCubeStateWithWasm(state) {
  const solverModule = await getSolverModule();
  const result = solverModule.ccall('solveCube', 'string', ['string'], [flattenState(state)]);

  if (!result || result === 'ERROR' || result.length !== 54) {
    throw new Error('WASM solver returned an invalid solved-state payload.');
  }

  return normalizeSolvedOrientation(unflattenState(result));
}

export async function solveCubeMoveListWithWasm(state) {
  const solverModule = await getSolverModule();
  const result = solverModule.ccall('solveCubeMoves', 'string', ['string'], [flattenState(state)]);

  if (result === 'ERROR') {
    throw new Error('WASM solver returned an invalid move-list payload.');
  }

  // The bridge returns a space-separated move string so the API can replay it
  // directly in the simulator without inventing a second move format.
  return result.trim() ? result.trim().split(/\s+/) : [];
}

export function cloneSolvedState(state) {
  return cloneCubeState(state);
}
