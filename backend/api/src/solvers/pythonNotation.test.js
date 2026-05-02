/**
 * pythonNotation.test.js — Tests for notation translation between our format
 * and the Python NxN solver's format.
 *
 * Run with: npm test (from backend/api/)
 * Uses Node's built-in test runner (node:test).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createSolvedState } from '../cube.js';
import {
  convertCanonicalMoveToSolver,
  flattenStateForSolver,
  normalizeSolverMoves,
  unflattenStateFromSolver,
} from './pythonNotation.js';

// ─── flattenStateForSolver ────────────────────────────────────────────────────

test('flattenStateForSolver produces correct length for 3x3', () => {
  const flat = flattenStateForSolver(createSolvedState(3));
  assert.equal(flat.length, 6 * 9);
});

test('flattenStateForSolver produces correct length for 2x2', () => {
  const flat = flattenStateForSolver(createSolvedState(2));
  assert.equal(flat.length, 6 * 4);
});

test('flattenStateForSolver produces correct length for 4x4', () => {
  const flat = flattenStateForSolver(createSolvedState(4));
  assert.equal(flat.length, 6 * 16);
});

test('flattenStateForSolver translates W stickers to U tokens', () => {
  const flat = flattenStateForSolver(createSolvedState(3));
  // The first face (U) has all W stickers → should all become 'U'
  const firstFace = flat.slice(0, 9);
  assert.ok([...firstFace].every((c) => c === 'U'), `expected all U tokens, got: ${firstFace}`);
});

test('flattenStateForSolver only contains valid solver tokens', () => {
  const validTokens = new Set(['U', 'R', 'F', 'D', 'L', 'B']);
  const flat = flattenStateForSolver(createSolvedState(4));
  for (const char of flat) {
    assert.ok(validTokens.has(char), `unexpected token: ${char}`);
  }
});

// ─── unflattenStateFromSolver ─────────────────────────────────────────────────

test('unflattenStateFromSolver round-trips a 3x3 solved state', () => {
  const original = createSolvedState(3);
  const flat = flattenStateForSolver(original);
  const restored = unflattenStateFromSolver(flat, 3);
  assert.deepEqual(restored, original);
});

test('unflattenStateFromSolver round-trips a 2x2 solved state', () => {
  const original = createSolvedState(2);
  const flat = flattenStateForSolver(original);
  const restored = unflattenStateFromSolver(flat, 2);
  assert.deepEqual(restored, original);
});

test('unflattenStateFromSolver round-trips a 4x4 solved state', () => {
  const original = createSolvedState(4);
  const flat = flattenStateForSolver(original);
  const restored = unflattenStateFromSolver(flat, 4);
  assert.deepEqual(restored, original);
});

test('unflattenStateFromSolver produces correct face array lengths', () => {
  const flat = flattenStateForSolver(createSolvedState(3));
  const state = unflattenStateFromSolver(flat, 3);
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B']) {
    assert.equal(state[face].length, 9);
  }
});

// ─── normalizeSolverMoves ─────────────────────────────────────────────────────

test('normalizeSolverMoves passes through standard 3x3 outer moves unchanged', () => {
  const moves = ['R', "U'", 'F2', 'D', "L'", 'B2'];
  const result = normalizeSolverMoves(moves, 3);
  assert.deepEqual(result, moves);
});

test('normalizeSolverMoves expands Rw (wide) to R + r on 4x4', () => {
  const result = normalizeSolverMoves(['Rw'], 4);
  assert.deepEqual(result, ['R', 'r']);
});

test('normalizeSolverMoves expands Rw-prime to R-prime + r-prime', () => {
  const result = normalizeSolverMoves(["Rw'"], 4);
  assert.deepEqual(result, ["R'", "r'"]);
});

test('normalizeSolverMoves expands Uw2 to U + U + u + u', () => {
  const result = normalizeSolverMoves(['Uw2'], 4);
  assert.deepEqual(result, ['U2', 'u2']);
});

test('normalizeSolverMoves translates 2R (inner) to r on 4x4', () => {
  const result = normalizeSolverMoves(['2R'], 4);
  assert.deepEqual(result, ['r']);
});

test('normalizeSolverMoves translates 2U-prime to u-prime on 4x4', () => {
  const result = normalizeSolverMoves(["2U'"], 4);
  assert.deepEqual(result, ["u'"]);
});

test('normalizeSolverMoves handles a mixed sequence', () => {
  const result = normalizeSolverMoves(['R', '2U', "Rw'"], 4);
  assert.deepEqual(result, ['R', 'u', "R'", "r'"]);
});

test('normalizeSolverMoves throws for an unsupported move token', () => {
  assert.throws(
    () => normalizeSolverMoves(['??'], 4),
    /Unsupported.*solver move/,
  );
});

test('normalizeSolverMoves handles empty array', () => {
  assert.deepEqual(normalizeSolverMoves([], 3), []);
});

// ─── convertCanonicalMoveToSolver ─────────────────────────────────────────────

test('convertCanonicalMoveToSolver passes through standard outer moves', () => {
  for (const move of ['R', "U'", 'F2', 'D', 'L', 'B']) {
    assert.equal(convertCanonicalMoveToSolver(move, 3), move);
  }
});

test('convertCanonicalMoveToSolver converts r to 2R on 4x4', () => {
  assert.equal(convertCanonicalMoveToSolver('r', 4), '2R');
});

test('convertCanonicalMoveToSolver converts r-prime to 2R-prime on 4x4', () => {
  assert.equal(convertCanonicalMoveToSolver("r'", 4), "2R'");
});

test('convertCanonicalMoveToSolver converts u2 to 2U2 on 4x4', () => {
  assert.equal(convertCanonicalMoveToSolver('u2', 4), '2U2');
});

test('convertCanonicalMoveToSolver converts all inner slices', () => {
  const pairs = [
    ['u', '2U'], ['d', '2D'], ['r', '2R'],
    ['l', '2L'], ['f', '2F'], ['b', '2B'],
  ];
  for (const [canonical, solver] of pairs) {
    assert.equal(convertCanonicalMoveToSolver(canonical, 4), solver);
  }
});

test('convertCanonicalMoveToSolver throws for empty move', () => {
  assert.throws(() => convertCanonicalMoveToSolver('', 3), /empty/i);
});
