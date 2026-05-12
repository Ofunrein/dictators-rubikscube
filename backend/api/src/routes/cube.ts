import type { FastifyInstance } from 'fastify';

import { applyMoveToState, applyMoves, createSolvedState, generateScramble, type CubeState } from '../cube.js';
import { sendApiError } from '../lib/http.js';
import { isSolvedState, solveStateFromHistory } from '../lib/solve.js';
// @ts-ignore — JS solver modules without declaration files
import { solveCubeStateWithPython } from '../solvers/pythonNxNSolver.js';
// @ts-ignore — JS solver modules without declaration files
import { solveCubeMoveListWithWasm } from '../solvers/wasmSolver.js';
import { validateMoveApplyRequest, validateScrambleRequest, validateSolveRequest } from '../validation.js';

// Short scrambles get Python NxN solver; longer ones get the WASM
// beginner layer-by-layer method which shows the full step-by-step animation.
const SHORT_SOLVE_THRESHOLD = 10;

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

    if (isSolvedState(state)) {
      reply.send({ moves: [], estimatedMoveCount: 0, isMock: false });
      return;
    }

    // Short scramble: use Python NxN solver (same as 2x2)
    // Skip if history contains slice moves — NxN solver requires fixed centers
    const hasSliceMoves = Array.isArray(moveHistory) && moveHistory.some((m) => /^[MESmes]/.test(m));
    if (Array.isArray(moveHistory) && moveHistory.length > 0 && moveHistory.length <= SHORT_SOLVE_THRESHOLD && !hasSliceMoves) {
      try {
        const payload = await solveCubeStateWithPython(state, 3) as Record<string, unknown>;
        const moves = payload['moves'] as string[];
        if (Array.isArray(moves) && moves.length > 0) {
          reply.send({
            moves,
            estimatedMoveCount: moves.length,
            isMock: false,
            solver: 'python-nxn-3',
          });
          return;
        }
      } catch {
        // fall through to WASM
      }
    }

    // Full scramble or no moveHistory: use WASM C++ layer-by-layer solver
    try {
      const wasmMoves = await solveCubeMoveListWithWasm(state as CubeState);
      if (wasmMoves.length > 0) {
        reply.send({
          moves: wasmMoves,
          estimatedMoveCount: wasmMoves.length,
          isMock: false,
          solver: 'eric-cpp-wasm-moves',
        });
        return;
      }
    } catch {
      // fall through
    }

    // Last resort: history inversion (no animation, but correct)
    if (Array.isArray(moveHistory) && moveHistory.length > 0) {
      const solvedMoves = solveStateFromHistory(state, moveHistory);
      if (solvedMoves) {
        reply.send({
          moves: solvedMoves,
          estimatedMoveCount: solvedMoves.length,
          isMock: false,
          solver: 'verified-history-inverse',
        });
        return;
      }
    }

    reply.send({
      moves: [],
      estimatedMoveCount: 0,
      isMock: false,
      note: 'Unable to solve. Try sending moveHistory.',
    });
  });
}
