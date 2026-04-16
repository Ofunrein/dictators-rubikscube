import { createSolvedState, FACE_ORDER } from '../../../backend/api/src/cube.js';
import {
  validateMoveApplyRequest,
  validateScrambleRequest,
  validateSolveRequest
} from '../../../backend/api/src/validation.js';
import { applyMoveToState, applyMoves, generateScramble } from '../../../backend/api/src/cube.js';
import { solveCubeMoveListWithWasm, solveCubeStateWithWasm } from '../../../backend/api/src/wasmSolver.js';

const SERVICE_NAME = 'rubiks-api';
const VERSION = '0.1.0';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function sendError(res, statusCode, code, message, details) {
  const error = { code, message };
  if (details && details.length > 0) error.details = details;
  sendJson(res, statusCode, { error });
}

function isSolvedState(state) {
  return FACE_ORDER.every((face) => state[face].every((s) => s === state[face][0]));
}

export default async function handler(req, res) {
  // Set CORS headers
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Parse the sub-path from the URL: /api/v1/[...path]
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1/, '');

  // GET /health
  if (req.method === 'GET' && path === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: SERVICE_NAME,
      version: VERSION,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // GET /cube/state/solved
  if (req.method === 'GET' && path === '/cube/state/solved') {
    sendJson(res, 200, { state: createSolvedState() });
    return;
  }

  // POST /cube/moves/apply
  if (req.method === 'POST' && path === '/cube/moves/apply') {
    const validation = validateMoveApplyRequest(req.body);
    if (!validation.ok) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
      return;
    }
    const { state, move } = validation.value;
    const nextState = applyMoveToState(state, move);
    sendJson(res, 200, { state: nextState, appliedMove: move });
    return;
  }

  // POST /cube/scramble
  if (req.method === 'POST' && path === '/cube/scramble') {
    const validation = validateScrambleRequest(req.body);
    if (!validation.ok) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
      return;
    }
    const { length, seed } = validation.value;
    const scramble = generateScramble(length, seed);
    const state = applyMoves(createSolvedState(), scramble);
    sendJson(res, 200, { scramble, state });
    return;
  }

  // POST /cube/solve
  if (req.method === 'POST' && path === '/cube/solve') {
    const validation = validateSolveRequest(req.body);
    if (!validation.ok) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
      return;
    }
    const { state } = validation.value;

    if (isSolvedState(state)) {
      sendJson(res, 200, { moves: [], estimatedMoveCount: 0, state });
      return;
    }

    try {
      // Match the local dev server behavior: prefer replayable solve moves first
      // so the frontend can show the actual sequence instead of an instant snap.
      const solveMoves = await solveCubeMoveListWithWasm(state);
      if (solveMoves.length > 0) {
        const replayedState = applyMoves(state, solveMoves);
        if (isSolvedState(replayedState)) {
          sendJson(res, 200, {
            moves: solveMoves,
            estimatedMoveCount: solveMoves.length,
            state: replayedState,
            solver: 'eric-cpp-wasm-moves'
          });
          return;
        }
      }

      // Keep a solved-state fallback for cases where the move-list export is not
      // usable even though the backend solver can still produce the right result.
      const solvedState = await solveCubeStateWithWasm(state);
      sendJson(res, 200, {
        moves: [],
        estimatedMoveCount: 0,
        state: solvedState,
        solver: 'eric-cpp-wasm'
      });
    } catch (error) {
      sendError(
        res,
        500,
        'SOLVER_FAILURE',
        error instanceof Error ? error.message : 'WASM solver failed unexpectedly.'
      );
    }
    return;
  }

  sendError(res, 404, 'NOT_FOUND', 'Route not found.');
}
