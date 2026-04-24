/**
 * api.test.js — Unit tests for the frontend HTTP client (net/api.js)
 *
 * Why it exists:
 *   api.js is the single module that owns all fetch() calls to the cube backend.
 *   These tests stub the global fetch to verify that the client serialises
 *   request bodies correctly and forwards optional fields (e.g. solve history)
 *   without requiring a live server.
 *
 * What is covered:
 *   - solveCubeRemote: verifies that a POST to the solve endpoint includes the
 *     cube state, solver strategy, cube size, and — when supplied — the
 *     reversible move history that lets the backend undo the scramble before
 *     running the solver.
 *
 * Testing approach:
 *   vi.stubGlobal('fetch', ...) replaces the browser/Node global fetch with a
 *   Vitest mock so no real network traffic is generated.  vi.unstubAllGlobals()
 *   in afterEach restores the original to avoid cross-test pollution.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSolvedState } from '../cube/cubeModel.js';
import { solveCubeRemote } from './api.js';

describe('solveCubeRemote', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes reversible history in solve requests when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        moves: ["F'", 'U', "R'"],
        state: createSolvedState(4),
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await solveCubeRemote(
      createSolvedState(4),
      'beginner',
      4,
      ['R', "U'", 'F'],
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({
      size: 4,
      strategy: 'beginner',
      history: ['R', "U'", 'F'],
    });
  });
});
