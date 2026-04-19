/**
 * solverHybrid.test.js — Integration tests for the solver pipeline
 *
 * These tests verify that the full solve flow works end-to-end:
 * creating solved states, applying moves via WASM, scrambling, solving,
 * and replay-validating solver output. Covers both the 3x3 WASM path
 * and the 2x2/4x4 Python solver path.
 *
 * Run with: npm test (from backend/api/)
 * Uses Node's built-in test runner (node:test), not Vitest.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { createSolvedState, applyMoves } from './cube.js';
import { replayValidatedMovesOrThrow } from './solvers/solvePipeline.js';
import { validateMoveApplyRequest } from './validation.js';
import { applyMovesWithPython, solveCubeStateWithPython } from './solvers/pythonNxNSolver.js';
import {
  applyMovesToSolvedWithWasm,
  applyMovesToStateWithWasm,
  createSolvedStateWithWasm,
  generateScrambleWithWasm,
  roundTripStateWithWasm,
  solveCubeMoveListWithWasm,
} from './solvers/wasmSolver.js';

function isSolvedState(state) {
  return Object.values(state).every((face) => face.every((sticker) => sticker === face[0]));
}

function createSeededRng(seed) {
  let current = seed >>> 0;
  return () => {
    current = (1664525 * current + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

function buildRandomSequence({ length, seed, bases }) {
  const random = createSeededRng(seed);
  const suffixes = ['', "'", '2'];
  const sequence = [];
  let previousBase = null;

  while (sequence.length < length) {
    const base = bases[Math.floor(random() * bases.length)];
    if (base === previousBase) {
      continue;
    }

    previousBase = base;
    const suffix = suffixes[Math.floor(random() * suffixes.length)];
    sequence.push(`${base}${suffix}`);
  }

  return sequence;
}

test('compiled helpers create solved states and round-trip arbitrary states', async () => {
  for (const size of [2, 3, 4]) {
    const solved = createSolvedState(size);
    const wasmSolved = await createSolvedStateWithWasm(size);
    assert.deepEqual(wasmSolved, solved);

    const movedState = applyMoves(solved, size === 4 ? ['R', 'r', "u'", 'F2'] : ['R', 'U', "F'"]);
    const roundTripped = await roundTripStateWithWasm(movedState, size);
    assert.deepEqual(roundTripped, movedState);
  }
});

test('2x2 and 4x4 outer turns stay in parity with the vendored solver', async () => {
  for (const size of [2, 4]) {
    for (let index = 0; index < 4; index += 1) {
      const sequence = buildRandomSequence({
        length: 7,
        seed: size * 100 + index,
        bases: ['U', 'D', 'L', 'R', 'F', 'B'],
      });

      const jsState = applyMoves(createSolvedState(size), sequence);
      const pythonState = await applyMovesWithPython(createSolvedState(size), sequence, size);
      assert.deepEqual(pythonState, jsState);
    }
  }
});

test('4x4 lowercase inner slices stay in parity with the vendored solver', async () => {
  const sequence = ['r', "u'", 'f2', 'l', 'd2', "b'"];
  const jsState = applyMoves(createSolvedState(4), sequence);
  const pythonState = await applyMovesWithPython(createSolvedState(4), sequence, 4);
  assert.deepEqual(pythonState, jsState);
});

test('solve move lists replay to solved for 2x2, 3x3, and 4x4 scrambles', async () => {
  const scramble2 = await generateScrambleWithWasm({ size: 2, numMoves: 6, seed: 7 });
  const solve2 = await solveCubeStateWithPython(scramble2.state, 2);
  const replay2 = await applyMovesToStateWithWasm(scramble2.state, solve2.moves, 2);
  assert.equal(isSolvedState(replay2), true);

  const scramble3 = await generateScrambleWithWasm({ size: 3, numMoves: 6, seed: 19 });
  const solve3 = await solveCubeMoveListWithWasm(scramble3.state);
  const replay3 = await applyMovesToStateWithWasm(scramble3.state, solve3, 3);
  assert.equal(isSolvedState(replay3), true);

  const scramble4 = await generateScrambleWithWasm({ size: 4, numMoves: 5, seed: 11 });
  const solve4 = await solveCubeStateWithPython(scramble4.state, 4);
  const replay4 = await applyMovesToStateWithWasm(scramble4.state, solve4.moves, 4);
  assert.equal(isSolvedState(replay4), true);
});

test('validation accepts lowercase 4x4 inner slices and rejects them on 2x2', () => {
  const validRequest = validateMoveApplyRequest({
    size: 4,
    state: createSolvedState(4),
    move: 'r',
  });
  assert.equal(validRequest.ok, true);

  const invalidRequest = validateMoveApplyRequest({
    size: 2,
    state: createSolvedState(2),
    move: 'r',
  });
  assert.equal(invalidRequest.ok, false);
});

test('replay validation throws when a returned move list does not solve the cube', async () => {
  await assert.rejects(
    replayValidatedMovesOrThrow({
      state: createSolvedState(4),
      moves: ['R'],
      size: 4,
      context: 'Intentional failure test',
    }),
    /Intentional failure test did not replay to a solved state\./,
  );
});

test('compiled move replay matches the shared JS move engine', async () => {
  const sequence = ['R', 'r', "u'", 'F2', 'x', "z'"];
  const jsState = applyMoves(createSolvedState(4), sequence);
  const wasmState = await applyMovesToSolvedWithWasm(sequence, 4);
  assert.deepEqual(wasmState, jsState);
});
