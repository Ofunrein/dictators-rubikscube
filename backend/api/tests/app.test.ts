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

const AI_HELP_PAYLOAD = {
  mode: 'hint',
  context: {
    cubeState: SOLVED_STATE,
    moveHistory: ['R', 'U', "R'"],
    scramble: ['F', 'R', 'U', "R'", "U'"],
    tutorialStepIndex: 2,
    tutorialStepTitle: 'First Two Layers (F2L)',
    timerMs: 45000,
    idleMs: 70000,
    solveDepth: 6,
    queueActive: false,
    isSolved: false,
  },
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

    const solveFromHistoryResponse = await app.inject({
      method: 'POST',
      url: '/v1/cube/solve',
      payload: {
        state: applyResponse.json().state,
        moveHistory: ['R'],
      },
    });
    expect(solveFromHistoryResponse.statusCode).toBe(200);
    expect(solveFromHistoryResponse.json().moves).toEqual(["R'"]);
    expect(solveFromHistoryResponse.json().isMock).toBe(false);

    const applySliceResponse = await app.inject({
      method: 'POST',
      url: '/v1/cube/moves/apply',
      payload: {
        state: SOLVED_STATE,
        move: 'M',
      },
    });
    expect(applySliceResponse.statusCode).toBe(200);

    const solveFromSliceHistoryResponse = await app.inject({
      method: 'POST',
      url: '/v1/cube/solve',
      payload: {
        state: applySliceResponse.json().state,
        moveHistory: ['M'],
      },
    });
    expect(solveFromSliceHistoryResponse.statusCode).toBe(200);
    expect(solveFromSliceHistoryResponse.json().moves).toEqual(["M'"]);

    const unsolvedWithoutHistoryResponse = await app.inject({
      method: 'POST',
      url: '/v1/cube/solve',
      payload: {
        state: applyResponse.json().state,
      },
    });
    expect(unsolvedWithoutHistoryResponse.statusCode).toBe(200);
    expect(unsolvedWithoutHistoryResponse.json().moves).toEqual([]);
    expect(unsolvedWithoutHistoryResponse.json().note).toContain('Include moveHistory');

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

  it('serves deterministic mock AI help responses and validates payloads', async () => {
    const app = buildApp({ prisma: createPrismaStub() as never, logger: false });
    await app.ready();

    const okResponse = await app.inject({
      method: 'POST',
      url: '/v1/ai/help',
      payload: AI_HELP_PAYLOAD,
    });

    expect(okResponse.statusCode).toBe(200);
    expect(okResponse.json()).toMatchObject({
      mode: 'hint',
      coachMessage: {
        id: 'coach_hint_v1',
      },
      meta: {
        isMock: true,
      },
    });
    expect(okResponse.json().requestId).toBeTruthy();
    expect(typeof okResponse.json().coachMessage.content).toBe('string');

    const badResponse = await app.inject({
      method: 'POST',
      url: '/v1/ai/help',
      payload: {
        context: {},
      },
    });

    expect(badResponse.statusCode).toBe(400);
    expect(badResponse.json().error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(badResponse.json().error.details)).toBe(true);

    await app.close();
  });

  it('supports progressive tutor modes including explain follow-up context', async () => {
    const app = buildApp({ prisma: createPrismaStub() as never, logger: false });
    await app.ready();

    const guideResponse = await app.inject({
      method: 'POST',
      url: '/v1/ai/help',
      payload: {
        ...AI_HELP_PAYLOAD,
        mode: 'guide',
      },
    });

    expect(guideResponse.statusCode).toBe(200);
    expect(guideResponse.json().mode).toBe('guide');
    expect(Array.isArray(guideResponse.json().coachMessage.nextActions)).toBe(true);

    const solveResponse = await app.inject({
      method: 'POST',
      url: '/v1/ai/help',
      payload: {
        ...AI_HELP_PAYLOAD,
        mode: 'solve',
      },
    });

    expect(solveResponse.statusCode).toBe(200);
    expect(solveResponse.json().mode).toBe('solve');
    expect(Array.isArray(solveResponse.json().coachMessage.moves)).toBe(true);

    const explainResponse = await app.inject({
      method: 'POST',
      url: '/v1/ai/help',
      payload: {
        ...AI_HELP_PAYLOAD,
        mode: 'explain',
        previousCoachResponse: {
          id: 'coach_prev',
          mode: 'guide',
          content: 'Pair first, then insert while preserving solved slots.',
        },
      },
    });

    expect(explainResponse.statusCode).toBe(200);
    expect(explainResponse.json().mode).toBe('explain');
    expect(explainResponse.json().coachMessage.content.startsWith('Why this works:')).toBe(true);
    expect(Array.isArray(explainResponse.json().coachMessage.nextActions)).toBe(true);

    await app.close();
  });

  it('analyzes candidate moves for coach validation', async () => {
    const app = buildApp({ prisma: createPrismaStub() as never, logger: false });
    await app.ready();

    const okResponse = await app.inject({
      method: 'POST',
      url: '/v1/ai/move/validate',
      payload: {
        state: SOLVED_STATE,
        candidateMove: 'R',
        moveHistory: ['U', 'R', "U'"],
        tutorialStepTitle: 'First Two Layers (F2L)',
      },
    });

    expect(okResponse.statusCode).toBe(200);
    expect(okResponse.json().requestId).toBeTruthy();
    expect(okResponse.json().validation).toMatchObject({
      move: 'R',
      isLegal: true,
    });
    expect(typeof okResponse.json().validation.reason).toBe('string');

    const badResponse = await app.inject({
      method: 'POST',
      url: '/v1/ai/move/validate',
      payload: {
        state: SOLVED_STATE,
        candidateMove: 'BAD',
      },
    });

    expect(badResponse.statusCode).toBe(200);
    expect(badResponse.json().validation).toMatchObject({
      move: 'BAD',
      isLegal: false,
      status: 'correction',
      shouldBlock: true,
    });

    await app.close();
  });
});

describe('AI endpoint rate limiting', () => {
  it('returns 429 after 10 requests to /v1/ai/help from same IP', async () => {
    const app = buildApp({ logger: false });
    await app.ready();

    const body = {
      mode: 'hint',
      context: {
        cubeState: SOLVED_STATE,
        moveHistory: [],
        scramble: [],
        tutorialStepIndex: null,
        timerMs: 0,
        idleMs: 0,
        solveDepth: 0,
        queueActive: false,
        isSolved: true,
      },
    };

    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/ai/help',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '99.99.99.99' },
        payload: JSON.stringify(body),
      });
      expect(res.statusCode).not.toBe(429);
    }

    const limited = await app.inject({
      method: 'POST',
      url: '/v1/ai/help',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '99.99.99.99' },
      payload: JSON.stringify(body),
    });
    expect(limited.statusCode).toBe(429);
    const parsed = JSON.parse(limited.body);
    expect(parsed.error.code).toBe('RATE_LIMITED');

    await app.close();
  }, 30000);

  it('does not rate limit GET /v1/health', async () => {
    const app = buildApp({ logger: false });
    await app.ready();

    for (let i = 0; i < 20; i++) {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/health',
        headers: { 'x-forwarded-for': '99.99.99.99' },
      });
      expect(res.statusCode).toBe(200);
    }

    await app.close();
  });
});
