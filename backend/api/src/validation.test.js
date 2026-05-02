/**
 * validation.test.js — Tests for API request validation
 *
 * Run with: npm test (from backend/api/)
 * Uses Node's built-in test runner (node:test).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createSolvedState } from './cube.js';
import {
  validateMoveApplyRequest,
  validateScrambleRequest,
  validateSolveRequest,
} from './validation.js';

// ─── validateMoveApplyRequest ────────────────────────────────────────────────

test('validateMoveApplyRequest: accepts valid 3x3 request', () => {
  const result = validateMoveApplyRequest({
    size: 3,
    state: createSolvedState(3),
    move: 'R',
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.size, 3);
  assert.equal(result.value.move, 'R');
});

test('validateMoveApplyRequest: accepts valid 4x4 request with inner-layer move', () => {
  const result = validateMoveApplyRequest({
    size: 4,
    state: createSolvedState(4),
    move: "r'",
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.move, "r'");
});

test('validateMoveApplyRequest: rejects when size is missing', () => {
  const result = validateMoveApplyRequest({
    state: createSolvedState(3),
    move: 'R',
  });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'size'));
});

test('validateMoveApplyRequest: rejects unsupported size', () => {
  const result = validateMoveApplyRequest({
    size: 5,
    state: createSolvedState(3),
    move: 'R',
  });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'size'));
});

test('validateMoveApplyRequest: rejects when state is missing', () => {
  const result = validateMoveApplyRequest({ size: 3, move: 'R' });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'state'));
});

test('validateMoveApplyRequest: rejects when move is missing', () => {
  const result = validateMoveApplyRequest({ size: 3, state: createSolvedState(3) });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'move'));
});

test('validateMoveApplyRequest: rejects invalid move for the given size', () => {
  const result = validateMoveApplyRequest({
    size: 2,
    state: createSolvedState(2),
    move: 'M',
  });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'move'));
});

test('validateMoveApplyRequest: rejects inner-layer moves on 2x2', () => {
  const result = validateMoveApplyRequest({
    size: 2,
    state: createSolvedState(2),
    move: 'r',
  });
  assert.equal(result.ok, false);
});

test('validateMoveApplyRequest: rejects unknown fields', () => {
  const result = validateMoveApplyRequest({
    size: 3,
    state: createSolvedState(3),
    move: 'R',
    extra: 'bad',
  });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'extra'));
});

test('validateMoveApplyRequest: rejects non-object body', () => {
  const result = validateMoveApplyRequest('not an object');
  assert.equal(result.ok, false);
});

test('validateMoveApplyRequest: returned value is a clone, not the original state', () => {
  const original = createSolvedState(3);
  const result = validateMoveApplyRequest({ size: 3, state: original, move: 'R' });
  assert.ok(result.value.state !== original);
  assert.deepEqual(result.value.state, original);
});

test('validateMoveApplyRequest: reports all errors at once, not just the first', () => {
  const result = validateMoveApplyRequest({ size: 5 });
  assert.equal(result.ok, false);
  assert.ok(result.details.length >= 2, 'should report both size and missing fields');
});

// ─── validateScrambleRequest ─────────────────────────────────────────────────

test('validateScrambleRequest: accepts valid 3x3 request', () => {
  const result = validateScrambleRequest({ size: 3 });
  assert.equal(result.ok, true);
  assert.equal(result.value.size, 3);
});

test('validateScrambleRequest: accepts optional length and seed', () => {
  const result = validateScrambleRequest({ size: 3, length: 20, seed: 42 });
  assert.equal(result.ok, true);
  assert.equal(result.value.length, 20);
  assert.equal(result.value.seed, 42);
});

test('validateScrambleRequest: rejects when size is missing', () => {
  const result = validateScrambleRequest({});
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'size'));
});

test('validateScrambleRequest: rejects length below 1', () => {
  const result = validateScrambleRequest({ size: 3, length: 0 });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'length'));
});

test('validateScrambleRequest: rejects length above 100', () => {
  const result = validateScrambleRequest({ size: 3, length: 101 });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'length'));
});

test('validateScrambleRequest: rejects non-integer length', () => {
  const result = validateScrambleRequest({ size: 3, length: 10.5 });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'length'));
});

test('validateScrambleRequest: rejects negative seed', () => {
  const result = validateScrambleRequest({ size: 3, seed: -1 });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'seed'));
});

test('validateScrambleRequest: rejects seed above 2147483647', () => {
  const result = validateScrambleRequest({ size: 3, seed: 2147483648 });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'seed'));
});

test('validateScrambleRequest: rejects unknown fields', () => {
  const result = validateScrambleRequest({ size: 3, unknown: true });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'unknown'));
});

test('validateScrambleRequest: accepts null/undefined body as empty object', () => {
  const result = validateScrambleRequest(null);
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'size'));
});

// ─── validateSolveRequest ────────────────────────────────────────────────────

test('validateSolveRequest: accepts valid 3x3 request', () => {
  const result = validateSolveRequest({ size: 3, state: createSolvedState(3) });
  assert.equal(result.ok, true);
  assert.equal(result.value.strategy, 'beginner');
});

test('validateSolveRequest: accepts valid strategy override', () => {
  const result = validateSolveRequest({
    size: 3,
    state: createSolvedState(3),
    strategy: 'cfop',
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.strategy, 'cfop');
});

test('validateSolveRequest: rejects invalid strategy', () => {
  const result = validateSolveRequest({
    size: 3,
    state: createSolvedState(3),
    strategy: 'random',
  });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'strategy'));
});

test('validateSolveRequest: rejects when state is missing', () => {
  const result = validateSolveRequest({ size: 3 });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'state'));
});

test('validateSolveRequest: rejects when size is missing', () => {
  const result = validateSolveRequest({ state: createSolvedState(3) });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'size'));
});

test('validateSolveRequest: rejects state with wrong sticker count for size', () => {
  const wrong = createSolvedState(3);
  wrong.U = wrong.U.slice(0, 4);
  const result = validateSolveRequest({ size: 3, state: wrong });
  assert.equal(result.ok, false);
});

test('validateSolveRequest: rejects unknown fields', () => {
  const result = validateSolveRequest({
    size: 3,
    state: createSolvedState(3),
    foo: 'bar',
  });
  assert.equal(result.ok, false);
  assert.ok(result.details.some((d) => d.path === 'foo'));
});

test('validateSolveRequest: rejects non-object body', () => {
  const result = validateSolveRequest(null);
  assert.equal(result.ok, false);
});

test('validateSolveRequest: returned state is a clone of the input', () => {
  const original = createSolvedState(3);
  const result = validateSolveRequest({ size: 3, state: original });
  assert.ok(result.value.state !== original);
  assert.deepEqual(result.value.state, original);
});
