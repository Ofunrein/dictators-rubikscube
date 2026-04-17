/**
 * wasmSolver.js — The bridge between our Node.js API and Eric's C++ solver
 *
 * HOW THIS WORKS (for people who have never seen WebAssembly):
 *
 *   Eric wrote the Rubik's Cube solving algorithm in C++ (see backend/src/cube/).
 *   C++ can't run directly inside a Vercel serverless function (which is JavaScript).
 *   So we compiled the C++ code into WebAssembly (WASM) — a binary format that
 *   JavaScript CAN run. The compiled file is api/solver.js.
 *
 *   This file loads that compiled solver and provides two functions:
 *
 *   1. solveCubeStateWithWasm(state)
 *      Takes a JS cube state object like { U: ['W','W',...], R: [...], ... }
 *      Flattens it into a 54-character string (one char per sticker)
 *      Sends it to Eric's C++ solver via WASM
 *      Gets back the solved state (also a 54-char string)
 *      Converts it back to a JS object
 *
 *   2. solveCubeMoveListWithWasm(state)
 *      Same input, but instead of returning the solved state, it returns
 *      the list of moves the solver used (e.g. ["R", "U'", "F", ...])
 *      so the frontend can animate them step by step.
 *
 * STATE FORMAT:
 *   JS side: { U: ['W','W','W','W','W','W','W','W','W'], R: [...], F: [...], D: [...], L: [...], B: [...] }
 *   WASM side: "WWWWWWWWWRRRRRRRRRGGGGGGGGGYYYYYYYYYOOOOOOOOOBBBBBBBBB" (54 chars)
 *   Face order in the flat string: U, R, F, D, L, B (9 chars each)
 *
 * COLOR TOKENS:
 *   W = White (Up face),  R = Red (Right),  G = Green (Front)
 *   Y = Yellow (Down),    O = Orange (Left), B = Blue (Back)
 */

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FACE_ORDER, cloneCubeState } from './cube.js';

// Load the compiled WASM solver file. createRequire is needed because
// the solver was compiled by Emscripten as a CommonJS module (require-style),
// but our project uses ES modules (import-style). This bridges the two.
const require = createRequire(import.meta.url);
const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '..', '..', '..');
const solverFactory = require(resolve(repoRoot, 'api', 'solver.js'));

// Maps sticker color tokens to their "home" face.
// The C++ solver uses integer colors internally (0-5), but when it returns
// the solved state, we need to know which face each color belongs to.
const TOKEN_TO_FACE = {
  W: 'U',   // White stickers belong on the Up face
  R: 'R',   // Red → Right
  G: 'F',   // Green → Front
  Y: 'D',   // Yellow → Down
  O: 'L',   // Orange → Left
  B: 'B'    // Blue → Back
};

let solverModulePromise = null;

// The WASM module is expensive to initialize (it has to compile the binary).
// We only do it once and reuse the same instance for every solve request.
function getSolverModule() {
  if (!solverModulePromise) {
    // The compiled solver bundle is expensive to bootstrap, so keep one shared
    // module instance alive for every solve request handled by this process.
    solverModulePromise = Promise.resolve(solverFactory({}));
  }
  return solverModulePromise;
}

// Convert JS state object → 54-char flat string for the C++ bridge.
// Example: { U: ['W','W',...], R: ['R','R',...], ... } → "WWWWWWWWWRRRRRRRRR..."
function flattenState(state) {
  // Eric's bridge expects the six faces in FACE_ORDER as one 54-character string.
  return FACE_ORDER.map((face) => state[face].join('')).join('');
}

// Convert 54-char flat string back to JS state object.
// The reverse of flattenState.
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

// The C++ solver can return the solved cube in a different face orientation
// than what the frontend expects (because of how the solver rotates the cube
// internally during solving). This function re-keys the faces by looking at
// the center sticker of each face and mapping it to the correct face label.
// For example: if the solver puts all-Green stickers on what it calls "U",
// we know Green belongs on "F", so we re-assign it.
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

// Main entry point: takes a JS cube state, calls Eric's solver, returns the solved state.
// Used by the /cube/solve API endpoint.
export async function solveCubeStateWithWasm(state) {
  const solverModule = await getSolverModule();
  const result = solverModule.ccall('solveCube', 'string', ['string'], [flattenState(state)]);

  if (!result || result === 'ERROR' || result.length !== 54) {
    throw new Error('WASM solver returned an invalid solved-state payload.');
  }

  return normalizeSolvedOrientation(unflattenState(result));
}

// Alternative entry point: returns the actual move sequence the solver used
// (e.g. ["R", "U'", "F", ...]) instead of just the solved state.
// This lets the frontend animate the solve step by step.
// Note: this path is not always reliable yet — sometimes the move list
// doesn't replay correctly even though the solver finds the right answer.
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

/**
 * Scramble using Eric's C++ scramble function via WASM.
 *
 * Eric's scramble uses std::mt19937 with true random seeding and prevents
 * cancelling moves (opposite rotations on same axis/layer back to back).
 * This produces higher quality scrambles than the pure-JS version.
 *
 * @param {number} numMoves - Number of random rotations (default 25).
 * @returns {Promise<object>} - Scrambled cube state in frontend format { U: [...], R: [...], ... }
 */
export async function scrambleCubeWithWasm(numMoves = 25) {
  const solverModule = await getSolverModule();
  const result = solverModule.ccall('scrambleCube', 'string', ['number'], [numMoves]);

  if (!result || result === 'ERROR' || result.length !== 54) {
    throw new Error('WASM scramble returned an invalid state.');
  }

  return unflattenState(result);
}

export function cloneSolvedState(state) {
  return cloneCubeState(state);
}
