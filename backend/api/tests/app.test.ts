import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

const SOLVED_STATE = {
  U: Array(9).fill('W'),
  R: Array(9).fill('R'),
  F: Array(9).fill('G'),
  D: Array(9).fill('Y'),
  L: Array(9).fill('O'),
  B: Array(9).fill('B'),
};

function createPrismaStub() {
  return {
    async $disconnect() {},
  };
}

describe('buildApp', () => {
  it('serves the health endpoint on the existing /v1 path', async () => {
    const app = buildApp({ prisma: createPrismaStub() as never, logger: false });
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: 'rubiks-api',
      version: '0.2.0',
    });

    await app.close();
  });

  it('preserves solved-state, move-apply, scramble, and solve routes', async () => {
    const app = buildApp({ prisma: createPrismaStub() as never, logger: false });
    await app.ready();

    const solvedResponse = await app.inject({
      method: 'GET',
      url: '/v1/cube/state/solved',
    });
    expect(solvedResponse.statusCode).toBe(200);
    expect(solvedResponse.json().state).toEqual(SOLVED_STATE);

    const applyResponse = await app.inject({
      method: 'POST',
      url: '/v1/cube/moves/apply',
      payload: {
        state: SOLVED_STATE,
        move: 'R',
      },
    });
    expect(applyResponse.statusCode).toBe(200);
    expect(applyResponse.json().appliedMove).toBe('R');
    expect(applyResponse.json().state).not.toEqual(SOLVED_STATE);

    const scrambleResponse = await app.inject({
      method: 'POST',
      url: '/v1/cube/scramble',
      payload: {
        length: 10,
        seed: 42,
      },
    });
    expect(scrambleResponse.statusCode).toBe(200);
    expect(scrambleResponse.json().scramble).toHaveLength(10);

    const solveResponse = await app.inject({
      method: 'POST',
      url: '/v1/cube/solve',
      payload: {
        state: SOLVED_STATE,
      },
    });
    expect(solveResponse.statusCode).toBe(200);
    expect(solveResponse.json().moves).toEqual([]);

    await app.close();
  });

  it('returns the structured validation error envelope for bad requests', async () => {
    const app = buildApp({ prisma: createPrismaStub() as never, logger: false });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/cube/moves/apply',
      payload: {
        state: {},
        move: 'bad',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
    expect(response.json().error.requestId).toBeTruthy();
    expect(Array.isArray(response.json().error.details)).toBe(true);

    await app.close();
  });
});
