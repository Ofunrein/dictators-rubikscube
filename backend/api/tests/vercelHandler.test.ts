import { describe, expect, it } from 'vitest';

import handler from '../../../api/v1/[...path].js';

const SOLVED_STATE = {
  U: Array(9).fill('W'),
  R: Array(9).fill('R'),
  F: Array(9).fill('G'),
  D: Array(9).fill('Y'),
  L: Array(9).fill('O'),
  B: Array(9).fill('B'),
};

const AI_HELP_CONTEXT = {
  cubeState: SOLVED_STATE,
  moveHistory: ['R', 'U', "R'"],
  scramble: ['F', 'R'],
  tutorialStepIndex: 2,
  tutorialStepTitle: 'First Two Layers (F2L)',
  timerMs: 41000,
  idleMs: 70000,
  solveDepth: 3,
  queueActive: false,
  isSolved: false,
};

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  payload: unknown;
  ended?: boolean;
  setHeader: (key: string, value: string) => void;
  status: (code: number) => MockResponse;
  json: (value: unknown) => MockResponse;
  end: () => MockResponse;
}

function createMockRequest(url: string, body: unknown, method = 'POST') {
  return {
    method,
    url,
    headers: {
      host: 'localhost:3000',
    },
    body,
  };
}

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(value: unknown) {
      this.payload = value;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

describe('vercel catch-all handler', () => {
  it('handles AI help success across all coach modes', async () => {
    const hintReq = createMockRequest('/api/v1/ai/help', {
      mode: 'hint',
      context: AI_HELP_CONTEXT,
    });
    const hintRes = createMockResponse();
    await handler(hintReq as never, hintRes as never);

    expect(hintRes.statusCode).toBe(200);
    expect((hintRes.payload as any).mode).toBe('hint');
    expect((hintRes.payload as any).meta?.isMock).toBe(true);
    expect(typeof (hintRes.payload as any).coachMessage?.content).toBe('string');
    expect(hintRes.headers['Access-Control-Allow-Origin']).toBe('*');

    const guideReq = createMockRequest('/api/v1/ai/help', {
      mode: 'guide',
      context: AI_HELP_CONTEXT,
    });
    const guideRes = createMockResponse();
    await handler(guideReq as never, guideRes as never);

    expect(guideRes.statusCode).toBe(200);
    expect((guideRes.payload as any).mode).toBe('guide');
    expect(Array.isArray((guideRes.payload as any).coachMessage?.nextActions)).toBe(true);

    const solveReq = createMockRequest('/api/v1/ai/help', {
      mode: 'solve',
      context: AI_HELP_CONTEXT,
    });
    const solveRes = createMockResponse();
    await handler(solveReq as never, solveRes as never);

    expect(solveRes.statusCode).toBe(200);
    expect((solveRes.payload as any).mode).toBe('solve');
    expect(Array.isArray((solveRes.payload as any).coachMessage?.moves)).toBe(true);

    const explainReq = createMockRequest('/api/v1/ai/help', {
      mode: 'explain',
      context: AI_HELP_CONTEXT,
      previousCoachResponse: {
        id: 'coach_prev',
        mode: 'guide',
        content: 'Pair first, then insert while preserving solved slots.',
      },
    });
    const explainRes = createMockResponse();
    await handler(explainReq as never, explainRes as never);

    expect(explainRes.statusCode).toBe(200);
    expect((explainRes.payload as any).mode).toBe('explain');
    expect(typeof (explainRes.payload as any).coachMessage?.content).toBe('string');
    expect(((explainRes.payload as any).coachMessage?.content as string).startsWith('Why this works:')).toBe(true);
  });

  it('handles AI help validation error flow', async () => {
    const badReq = createMockRequest('/api/v1/ai/help', {
      mode: 'hint',
      context: {},
    });
    const badRes = createMockResponse();
    await handler(badReq as never, badRes as never);

    expect(badRes.statusCode).toBe(400);
    expect((badRes.payload as any).error?.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray((badRes.payload as any).error?.details)).toBe(true);
  });

  it('handles OPTIONS preflight with CORS headers', async () => {
    const optionsReq = createMockRequest('/api/v1/ai/help', null, 'OPTIONS');
    const optionsRes = createMockResponse();
    await handler(optionsReq as never, optionsRes as never);

    expect(optionsRes.statusCode).toBe(204);
    expect(optionsRes.ended).toBe(true);
    expect(optionsRes.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(optionsRes.headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
  });

  it('handles move validation success and validation error flows', async () => {
    const okReq = createMockRequest('/api/v1/ai/move/validate', {
      state: SOLVED_STATE,
      candidateMove: 'R',
      moveHistory: ['U', 'R', "U'"],
      tutorialStepTitle: 'First Two Layers (F2L)',
    });
    const okRes = createMockResponse();
    await handler(okReq as never, okRes as never);

    expect(okRes.statusCode).toBe(200);
    expect((okRes.payload as any).validation?.move).toBe('R');
    expect((okRes.payload as any).validation?.isLegal).toBe(true);
    expect(typeof (okRes.payload as any).validation?.reason).toBe('string');

    const badReq = createMockRequest('/api/v1/ai/move/validate', {
      state: SOLVED_STATE,
      candidateMove: 'BAD',
    });
    const badRes = createMockResponse();
    await handler(badReq as never, badRes as never);

    expect(badRes.statusCode).toBe(200);
    expect((badRes.payload as any).validation).toMatchObject({
      move: 'BAD',
      isLegal: false,
      status: 'correction',
      shouldBlock: true,
    });
  });

  it('solves unsolved states when moveHistory is provided', async () => {
    const moveReq = createMockRequest('/api/v1/cube/moves/apply', {
      state: SOLVED_STATE,
      move: 'R',
    });
    const moveRes = createMockResponse();
    await handler(moveReq as never, moveRes as never);
    expect(moveRes.statusCode).toBe(200);

    const solveReq = createMockRequest('/api/v1/cube/solve', {
      state: (moveRes.payload as any).state,
      moveHistory: ['R'],
    });
    const solveRes = createMockResponse();
    await handler(solveReq as never, solveRes as never);

    expect(solveRes.statusCode).toBe(200);
    expect((solveRes.payload as any).moves).toEqual(["R'"]);
    expect((solveRes.payload as any).isMock).toBe(false);
  });
});
