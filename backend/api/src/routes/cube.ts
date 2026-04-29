import type { FastifyInstance } from 'fastify';

import { applyMoveToState, applyMoves, createSolvedState, generateScramble } from '../cube.js';
import { sendApiError } from '../lib/http.js';
import { isSolvedState, solveStateFromHistory } from '../lib/solve.js';
import { validateMoveApplyRequest, validateScrambleRequest, validateSolveRequest } from '../validation.js';

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

    const { state, moveHistory } = validation.value;
    const alreadySolved = isSolvedState(state);

    if (alreadySolved) {
      reply.send({
        moves: [],
        estimatedMoveCount: 0,
        isMock: false,
        note: 'Cube is already solved; returning an empty solution.',
      });
      return;
    }

    if (Array.isArray(moveHistory) && moveHistory.length > 0) {
      const solvedMoves = solveStateFromHistory(state, moveHistory);
      if (solvedMoves) {
        reply.send({
          moves: solvedMoves,
          estimatedMoveCount: solvedMoves.length,
          isMock: false,
          note: 'Solved by inverting verified session move history.',
        });
        return;
      }
    }

    reply.send({
      moves: [],
      estimatedMoveCount: 0,
      isMock: false,
      note: 'Unable to derive a verified solution from state alone. Include moveHistory for deterministic solve reconstruction.',
    });
  });
}
