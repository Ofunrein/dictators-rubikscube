import type { FastifyInstance } from 'fastify';

import { applyMoveToState, applyMoves, createSolvedState, FACE_ORDER, generateScramble } from '../cube.js';
import { sendApiError } from '../lib/http.js';
import { validateMoveApplyRequest, validateScrambleRequest, validateSolveRequest } from '../validation.js';

function isSolvedState(state: Record<string, string[]>): boolean {
  return FACE_ORDER.every((face) => state[face].every((sticker) => sticker === state[face][0]));
}

export default async function cubeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/state/solved', async (_request, reply) => {
    reply.send({ state: createSolvedState() });
  });

  app.post('/moves/apply', async (request, reply) => {
    const validation = validateMoveApplyRequest(request.body);
    if (!validation.ok) {
      sendApiError(reply, 400, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
      return;
    }

    const { state, move } = validation.value;
    reply.send({
      state: applyMoveToState(state, move),
      appliedMove: move,
    });
  });

  app.post('/scramble', async (request, reply) => {
    const validation = validateScrambleRequest(request.body);
    if (!validation.ok) {
      sendApiError(reply, 400, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
      return;
    }

    const { length, seed } = validation.value;
    const scramble = generateScramble(length, seed);
    const state = applyMoves(createSolvedState(), scramble);
    reply.send({ scramble, state });
  });

  app.post('/solve', async (request, reply) => {
    const validation = validateSolveRequest(request.body);
    if (!validation.ok) {
      sendApiError(reply, 400, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
      return;
    }

    const { state } = validation.value;
    const alreadySolved = isSolvedState(state);

    reply.send({
      moves: alreadySolved ? [] : ["R'", "U'", 'F'],
      estimatedMoveCount: alreadySolved ? 0 : 3,
      isMock: true,
      note: alreadySolved
        ? 'Cube is already solved; returning an empty solution.'
        : 'Solver implementation is stubbed in Sprint 2 and currently returns a placeholder response.',
    });
  });
}
