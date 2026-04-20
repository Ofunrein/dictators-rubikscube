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
