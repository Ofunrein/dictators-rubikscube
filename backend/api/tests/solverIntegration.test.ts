import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { applyMoves, createSolvedState, type CubeState } from '../src/cube.js';
import { isSolvedState } from '../src/lib/solve.js';

// A short deterministic scramble (5 moves — well under the 10-move short-solve threshold)
const SHORT_SCRAMBLE = ["R", "U", "F", "R'", "U'"];
// A full scramble (20 moves — above threshold, should use WASM)
const FULL_SCRAMBLE = ["R", "U", "F", "L", "B", "D", "R'", "U'", "F'", "L'", "B'", "D'", "R2", "U2", "F2", "L2", "B2", "R", "U", "F"];

const SOLVED_STATE = createSolvedState();

function scrambledState(moves: string[]): CubeState {
  return applyMoves(SOLVED_STATE, moves);
}

function createPrismaStub() {
  return { async $disconnect() {} };
}

describe('solver integration', () => {
  it('returns actual solve moves (not empty) when no moveHistory is provided', async () => {
    const app = buildApp({ prisma: createPrismaStub() as never, logger: false });
    await app.ready();

    const state = scrambledState(SHORT_SCRAMBLE);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cube/solve',
      payload: { state },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.moves)).toBe(true);
    expect(body.moves.length).toBeGreaterThan(0);

    // Applying those moves to the scrambled state must yield a solved cube
    const resultState = applyMoves(state, body.moves);
    expect(isSolvedState(resultState)).toBe(true);

    await app.close();
  }, 30000);

  it('uses Python NxN solver (python-nxn-3) for short scrambles (≤10 moves)', async () => {
    const app = buildApp({ prisma: createPrismaStub() as never, logger: false });
    await app.ready();

    const state = scrambledState(SHORT_SCRAMBLE);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cube/solve',
      payload: { state, moveHistory: SHORT_SCRAMBLE },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.solver).toBe('python-nxn-3');
    expect(Array.isArray(body.moves)).toBe(true);
    expect(body.moves.length).toBeGreaterThan(0);

    const resultState = applyMoves(state, body.moves);
    expect(isSolvedState(resultState)).toBe(true);

    await app.close();
  }, 30000);

  it('uses WASM C++ solver for full scrambles (>10 moves)', async () => {
    const app = buildApp({ prisma: createPrismaStub() as never, logger: false });
    await app.ready();

    const state = scrambledState(FULL_SCRAMBLE);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/cube/solve',
      payload: { state, moveHistory: FULL_SCRAMBLE },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.solver).toBe('eric-cpp-wasm-moves');
    expect(Array.isArray(body.moves)).toBe(true);
    expect(body.moves.length).toBeGreaterThan(0);

    const resultState = applyMoves(state, body.moves);
    expect(isSolvedState(resultState)).toBe(true);

    await app.close();
  }, 30000);
});
