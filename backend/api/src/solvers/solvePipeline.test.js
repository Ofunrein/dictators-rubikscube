/**
 * solvePipeline.test.js — Tests for solve replay validation helpers
 *
 * isSolvedState is a pure function and tested directly.
 * replayValidatedMovesOrThrow depends on the WASM move engine so its error
 * path is also covered (the WASM binary is available in this environment).
 *
 * Run with: npm test (from backend/api/)
 * Uses Node's built-in test runner (node:test).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createSolvedState, applyMoves } from '../cube.js';
import { isSolvedState, replayValidatedMovesOrThrow } from './solvePipeline.js';

// ─── isSolvedState ────────────────────────────────────────────────────────────

test('isSolvedState returns true for a freshly solved 3x3', () => {
  assert.equal(isSolvedState(createSolvedState(3)), true);
});

test('isSolvedState returns true for a freshly solved 2x2', () => {
  assert.equal(isSolvedState(createSolvedState(2)), true);
});

test('isSolvedState returns true for a freshly solved 4x4', () => {
  assert.equal(isSolvedState(createSolvedState(4)), true);
});

test('isSolvedState returns false after a single R move on 3x3', () => {
  const state = applyMoves(createSolvedState(3), ['R']);
  assert.equal(isSolvedState(state), false);
});

test('isSolvedState returns false after multiple moves on 3x3', () => {
  const state = applyMoves(createSolvedState(3), ['R', 'U', "F'", 'D2']);
  assert.equal(isSolvedState(state), false);
});

test('isSolvedState returns true after a move followed by its inverse on 3x3', () => {
  const state = applyMoves(createSolvedState(3), ['R', "R'"]);
  assert.equal(isSolvedState(state), true);
});

test('isSolvedState returns true after four identical moves on 2x2', () => {
  const state = applyMoves(createSolvedState(2), ['U', 'U', 'U', 'U']);
  assert.equal(isSolvedState(state), true);
});

test('isSolvedState returns false after a single inner-layer move on 4x4', () => {
  const state = applyMoves(createSolvedState(4), ['r']);
  assert.equal(isSolvedState(state), false);
});

// ─── replayValidatedMovesOrThrow ──────────────────────────────────────────────

test('replayValidatedMovesOrThrow throws when moves do not solve the cube', async () => {
  const scrambled = applyMoves(createSolvedState(3), ['R', 'U', 'F']);
  await assert.rejects(
    replayValidatedMovesOrThrow({
      state: scrambled,
      moves: ['R'],
      size: 3,
      context: 'test context',
    }),
    /test context did not replay to a solved state/,
  );
});

test('replayValidatedMovesOrThrow throws with context label in message', async () => {
  const scrambled = applyMoves(createSolvedState(3), ['R']);
  await assert.rejects(
    replayValidatedMovesOrThrow({
      state: scrambled,
      moves: ['U'],
      size: 3,
      context: 'my solver path',
    }),
    /my solver path/,
  );
});

test('replayValidatedMovesOrThrow resolves for an empty move list on an already-solved cube', async () => {
  const solved = createSolvedState(3);
  const result = await replayValidatedMovesOrThrow({
    state: solved,
    moves: [],
    size: 3,
    context: 'empty moves on solved',
  });
  assert.equal(isSolvedState(result), true);
});
