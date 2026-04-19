/**
 * wasmSolver.js — Node.js wrapper around the compiled C++ / WASM cube bridge
 *
 * This file is the JavaScript side of the "compiled lane."
 *
 * What the compiled lane handles:
 *   - making solved states by cube size
 *   - applying canonical move sequences to solved or arbitrary states
 *   - generating scrambles in compiled code
 *   - solving 3x3 with Eric's original C++ algorithm
 *
 * Why keep this wrapper:
 *   The raw Emscripten bundle (`api/solver.js`) only exposes C-style functions.
 *   This file turns those low-level string calls into normal JavaScript helpers
 *   that the API routes and tests can use safely.
 *
 * Flat-string format:
 *   U R F D L B face order
 *   size * size stickers per face
 *   Example lengths:
 *     2x2 -> 24
 *     3x3 -> 54
 *     4x4 -> 96
 */

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FACE_ORDER, cloneCubeState, getFaceSize, normalizeCubeSize } from '../cube.js';

// Load the compiled WASM module. createRequire is needed because the solver
// bundle (api/solver.js) is a CommonJS module, but our server uses ES modules.
// This is a common trick when mixing module systems in Node.js.
const require = createRequire(import.meta.url);
const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '..', '..', '..', '..');
const solverFactory = require(resolve(repoRoot, 'api', 'solver.js'));

// Singleton: the WASM module is heavy to initialize, so we only do it once
// and reuse the same instance for all requests.
let solverModulePromise = null;

function getSolverModule() {
  if (!solverModulePromise) {
    solverModulePromise = Promise.resolve(solverFactory({}));
  }
  return solverModulePromise;
}

function getStickerCount(size) {
  return normalizeCubeSize(size) ** 2;
}

function getFlatLength(size) {
  return 6 * getStickerCount(size);
}

// Converts our object-based cube state into a flat string for the WASM module.
// The WASM C++ code expects a single string like "WWWWWWWWWRRRRRRRRR..."
// with all 6 faces concatenated in U R F D L B order.
function flattenState(state, size = getFaceSize(state)) {
  const normalizedSize = normalizeCubeSize(size);
  return FACE_ORDER.map((face) => {
    const stickers = state[face];
    if (!Array.isArray(stickers) || stickers.length !== getStickerCount(normalizedSize)) {
      throw new Error(`State face ${face} does not match a ${normalizedSize}x${normalizedSize} cube.`);
    }
    return stickers.join('');
  }).join('');
}

// Converts a flat string back into our object-based cube state.
// Splits the string into 6 chunks (one per face) and turns each into an array.
function unflattenState(flat, size) {
  const normalizedSize = normalizeCubeSize(size);
  const stickerCount = getStickerCount(normalizedSize);

  if (typeof flat !== 'string' || flat.length !== getFlatLength(normalizedSize)) {
    throw new Error(`Expected a ${getFlatLength(normalizedSize)}-character flat state, received ${flat?.length ?? 'nothing'}.`);
  }

  const state = {};
  for (let index = 0; index < FACE_ORDER.length; index += 1) {
    const face = FACE_ORDER[index];
    const start = index * stickerCount;
    state[face] = flat.slice(start, start + stickerCount).split('');
  }
  return state;
}

function encodeMoveSequence(moves = []) {
  if (!Array.isArray(moves)) {
    throw new Error('Move sequence must be an array.');
  }
  return moves.join(' ');
}

// Core helper: calls a WASM C function by name using Emscripten's ccall().
// ccall is the standard Emscripten way to call C functions from JavaScript.
// It handles string marshalling (copying JS strings into WASM memory and back).
// The WASM functions return flat strings; this helper validates the result
// and throws a clear error if anything goes wrong.
async function callSolverString(exportName, returnContext, argTypes, args, { allowEmpty = false } = {}) {
  const solverModule = await getSolverModule();
  const result = solverModule.ccall(exportName, 'string', argTypes, args);

  if ((result === null || result === undefined || (!allowEmpty && result === '')) || result === 'ERROR') {
    throw new Error(`${returnContext} failed in ${exportName}.`);
  }

  return result;
}

// Calls a WASM function that returns a flat state string, then unflattens it
// back into our object-based state format. Most WASM exports follow this pattern.
async function callFlatStateExport(exportName, size, argTypes, args) {
  const normalizedSize = normalizeCubeSize(size);
  const flat = await callSolverString(exportName, `Flat-state export for ${normalizedSize}x${normalizedSize}`, argTypes, args);
  return unflattenState(flat, normalizedSize);
}

export async function createSolvedStateWithWasm(size = 3) {
  const normalizedSize = normalizeCubeSize(size);
  return callFlatStateExport(
    'createSolvedCubeSized',
    normalizedSize,
    ['number'],
    [normalizedSize],
  );
}

export async function roundTripStateWithWasm(state, size = getFaceSize(state)) {
  const normalizedSize = normalizeCubeSize(size);
  return callFlatStateExport(
    normalizedSize === 3 ? 'roundTripState' : 'roundTripStateSized',
    normalizedSize,
    normalizedSize === 3 ? ['string'] : ['number', 'string'],
    normalizedSize === 3
      ? [flattenState(state, normalizedSize)]
      : [normalizedSize, flattenState(state, normalizedSize)],
  );
}

export async function applyMovesToSolvedWithWasm(moves, size = 3) {
  const normalizedSize = normalizeCubeSize(size);
  const moveSequence = encodeMoveSequence(moves);

  return callFlatStateExport(
    normalizedSize === 3 ? 'applyMovesToSolved' : 'applyMovesToSolvedSized',
    normalizedSize,
    normalizedSize === 3 ? ['string'] : ['number', 'string'],
    normalizedSize === 3
      ? [moveSequence]
      : [normalizedSize, moveSequence],
  );
}

export async function applyMovesToStateWithWasm(state, moves, size = getFaceSize(state)) {
  const normalizedSize = normalizeCubeSize(size);
  const moveSequence = encodeMoveSequence(moves);

  return callFlatStateExport(
    normalizedSize === 3 ? 'applyMovesToState' : 'applyMovesToStateSized',
    normalizedSize,
    normalizedSize === 3 ? ['string', 'string'] : ['number', 'string', 'string'],
    normalizedSize === 3
      ? [flattenState(state, normalizedSize), moveSequence]
      : [normalizedSize, flattenState(state, normalizedSize), moveSequence],
  );
}

export async function solveCubeStateWithWasm(state) {
  const normalizedSize = normalizeCubeSize(getFaceSize(state));
  if (normalizedSize !== 3) {
    throw new Error('Eric WASM solve only supports 3x3 states.');
  }

  return callFlatStateExport(
    'solveCube',
    3,
    ['string'],
    [flattenState(state, 3)],
  );
}

export async function solveCubeMoveListWithWasm(state) {
  const normalizedSize = normalizeCubeSize(getFaceSize(state));
  if (normalizedSize !== 3) {
    throw new Error('Eric WASM move-list solve only supports 3x3 states.');
  }

  const result = await callSolverString(
    'solveCubeMoves',
    '3x3 solve move list',
    ['string'],
    [flattenState(state, 3)],
    { allowEmpty: true },
  );

  return result.trim() ? result.trim().split(/\s+/) : [];
}

export async function generateScrambleWithWasm({ size = 3, numMoves, seed } = {}) {
  const normalizedSize = normalizeCubeSize(size);
  const requestedMoves = Number.isInteger(numMoves) ? numMoves : 0;
  const scrambleSeed = Number.isInteger(seed) ? seed : -1;

  if (normalizedSize === 3 && scrambleSeed < 0) {
    // Keep the legacy export working for old callers, but use the new generic
    // sequence export so we can always return both the scramble and the state.
  }

  const scrambleText = await callSolverString(
    'scrambleCubeSequenceSized',
    `${normalizedSize}x${normalizedSize} scramble sequence`,
    ['number', 'number', 'number'],
    [normalizedSize, requestedMoves, scrambleSeed],
  );

  const scramble = scrambleText.trim() ? scrambleText.trim().split(/\s+/) : [];
  const state = await applyMovesToSolvedWithWasm(scramble, normalizedSize);

  return {
    size: normalizedSize,
    scramble,
    state,
    scrambler: 'compiled-cpp-wasm',
  };
}

export async function scrambleCubeWithWasm(numMoves = 25) {
  const payload = await generateScrambleWithWasm({ size: 3, numMoves });
  return cloneCubeState(payload.state);
}
