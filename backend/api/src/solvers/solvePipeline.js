/**
 * solvePipeline.js — Replay validation for solver output
 *
 * When a solver says "here are the moves that solve the cube," we don't just
 * trust it — we replay those moves through our own move engine and check that
 * the result is actually solved. This catches bugs in solver output, notation
 * translation errors, and edge cases where the solver's internal state format
 * doesn't match ours.
 *
 * Both the local dev server (server.js) and the Vercel handler ([...path].js)
 * use these helpers, which is why they live in their own file.
 *
 * Exports:
 *   isSolvedState(state)                    → true if every face is one color
 *   replayValidatedMovesOrThrow({ ... })    → replays moves and throws if not solved
 */

import { FACE_ORDER } from '../cube.js';
import { applyMovesToStateWithWasm } from './wasmSolver.js';

// A cube is solved when every sticker on each face matches the first sticker
// on that face (meaning all 9 stickers on U are the same color, etc.).
export function isSolvedState(state) {
  return FACE_ORDER.every((face) => state[face].every((sticker) => sticker === state[face][0]));
}

// Replays the solver's move list through the compiled WASM move engine.
// If the final state isn't solved, throws an error with the context string
// so the route handler knows which solver path failed.
export async function replayValidatedMovesOrThrow({ state, moves, size, context }) {
  const replayedState = await applyMovesToStateWithWasm(state, moves, size);

  if (!isSolvedState(replayedState)) {
    throw new Error(`${context} did not replay to a solved state.`);
  }

  return replayedState;
}
