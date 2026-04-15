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
    solverModulePromise = Promise.resolve(solverFactory({}));
  }
  return solverModulePromise;
}

function flattenState(state) {
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

  return result.trim() ? result.trim().split(/\s+/) : [];
}

export function cloneSolvedState(state) {
  return cloneCubeState(state);
}
