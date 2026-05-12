import { describe, expect, it, vi } from 'vitest';

// Mock the Python solver BEFORE importing the handler so the mock is in place
vi.mock('../src/solvers/pythonNxNSolver.js', () => ({
  solveCubeStateWithPython: vi.fn().mockRejectedValue(
    new Error('Vendored NxN solver directory is missing.')
  ),
}));

import handler from '../../../api/v1/[...path].js';
import { applyMoveToState, createSolvedState } from '../src/cube.js';
import { isSolvedState } from '../src/lib/solve.js';

const SOLVED_STATE = createSolvedState();

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
      'x-vercel-id': 'iad1::test-fallback',
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

describe('solver fallback when Python solver unavailable', () => {
  it(
    'falls back to WASM solver and returns 200 when Kociemba throws',
    async () => {
      // Apply move 'R' to get a scrambled state
      const scrambledState = applyMoveToState(SOLVED_STATE, 'R');

      const req = createMockRequest('/api/v1/cube/solve', {
        state: scrambledState,
        moveHistory: ['R'],
      });
      const res = createMockResponse();

      await handler(req as never, res as never);

      expect(res.statusCode).toBe(200);
      const body = res.payload as any;
      expect(Array.isArray(body.moves)).toBe(true);
      expect(body.moves.length).toBeGreaterThan(0);
      expect(body.solver).toBe('eric-cpp-wasm-moves');
      expect(body.isMock).toBe(false);

      // Applying the returned moves to scrambledState must produce a solved cube
      const { applyMoves } = await import('../src/cube.js');
      const resultState = applyMoves(scrambledState, body.moves);
      expect(isSolvedState(resultState)).toBe(true);
    },
    { timeout: 30000 }
  );
});
