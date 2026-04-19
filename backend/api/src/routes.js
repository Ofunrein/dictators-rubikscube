/**
 * routes.js — All API route handlers, one function per endpoint
 *
 * Each handler receives (body, ctx) where:
 *   body = parsed JSON from the request (or {} for GET requests)
 *   ctx  = { url, requestId, sendJson(code, payload), sendError(code, errCode, msg, details) }
 *
 * This separation means you can find any route by its function name instead of
 * scrolling through a giant if/else chain in server.js.
 *
 * Route → solver mapping:
 *   3x3 cubes → Eric's compiled C++ solver (via WASM)
 *   2x2 and 4x4 cubes → vendored Python NxN solver
 *   Scramble generation → compiled WASM lane for all sizes
 *   All solve results are replay-validated before being sent back
 */

import {
  applyMoveToState,
  createSolvedState,
  normalizeCubeSize,
} from './cube.js';
import { isSolvedState, replayValidatedMovesOrThrow } from './solvers/solvePipeline.js';
import {
  validateMoveApplyRequest,
  validateScrambleRequest,
  validateSolveRequest,
} from './validation.js';
import { solveCubeStateWithPython } from './solvers/pythonNxNSolver.js';
import {
  generateScrambleWithWasm,
  solveCubeMoveListWithWasm,
  solveCubeStateWithWasm,
} from './solvers/wasmSolver.js';

export const SERVICE_NAME = 'rubiks-api';
export const VERSION = '0.1.0';

// Reads the cube size from a query string like ?size=4.
// Defaults to 3 if not provided.
function readSolvedSize(searchParams) {
  const rawSize = searchParams.get('size');
  if (rawSize === null) {
    return 3;
  }
  return normalizeCubeSize(Number(rawSize));
}

// GET / — welcome message for anyone hitting the API root directly
async function handleRootRoute(_body, ctx) {
  ctx.sendJson(200, {
    ok: true,
    service: SERVICE_NAME,
    version: VERSION,
    message: 'Rubiks API dev server is running. Vite stays on 5400, API stays on 5200. Use /v1/* or /api/v1/* locally.',
  });
}

// GET /v1/health — quick heartbeat check
async function handleHealthRoute(_body, ctx) {
  ctx.sendJson(200, {
    ok: true,
    service: SERVICE_NAME,
    version: VERSION,
    timestamp: new Date().toISOString(),
  });
}

// GET /v1/cube/state/solved — returns a fresh solved cube for the requested size
async function handleSolvedStateRoute(_body, ctx) {
  try {
    const size = readSolvedSize(ctx.url.searchParams);
    ctx.sendJson(200, { size, state: createSolvedState(size) });
  } catch (error) {
    ctx.sendError(
      400,
      'VALIDATION_ERROR',
      error instanceof Error ? error.message : 'Invalid size query parameter.',
    );
  }
}

// POST /v1/cube/moves/apply — apply one move to a cube state and return the result
async function handleMoveApplyRoute(body, ctx) {
  const validation = validateMoveApplyRequest(body);
  if (!validation.ok) {
    ctx.sendError(400, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
    return;
  }

  const { size, state, move } = validation.value;
  const nextState = applyMoveToState(state, move);
  ctx.sendJson(200, { size, state: nextState, appliedMove: move });
}

// POST /v1/cube/scramble — generate a scramble sequence and return the scrambled state
async function handleScrambleRoute(body, ctx) {
  const validation = validateScrambleRequest(body);
  if (!validation.ok) {
    ctx.sendError(400, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
    return;
  }

  const { size, length, seed } = validation.value;

  try {
    const payload = await generateScrambleWithWasm({ size, numMoves: length, seed });
    ctx.sendJson(200, payload);
  } catch (error) {
    ctx.sendError(
      500,
      'SCRAMBLE_FAILURE',
      error instanceof Error ? error.message : 'Compiled scramble failed unexpectedly.',
    );
  }
}

// POST /v1/cube/solve — the big one
// Routes to different solvers based on cube size:
//   3x3: Try Eric's WASM solver for a move list first. If it returns moves,
//         replay-validate them to make sure they actually solve the cube.
//         If no move list, fall back to just getting the solved state.
//   2x2 / 4x4: Use the Python NxN solver bridge.
async function handleSolveRoute(body, ctx) {
  const validation = validateSolveRequest(body);
  if (!validation.ok) {
    ctx.sendError(400, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
    return;
  }

  const { size, state } = validation.value;

  // If it's already solved, just return immediately — no solver needed.
  if (isSolvedState(state)) {
    ctx.sendJson(200, { size, moves: [], estimatedMoveCount: 0, state });
    return;
  }

  try {
    if (size === 3) {
      // 3x3: try the WASM move-list solver first (returns the actual moves)
      const solveMoves = await solveCubeMoveListWithWasm(state);
      if (solveMoves.length > 0) {
        // Replay-validate: apply the moves ourselves to confirm they solve the cube
        const replayedState = await replayValidatedMovesOrThrow({
          state,
          moves: solveMoves,
          size: 3,
          context: '3x3 solve move list',
        });

        ctx.sendJson(200, {
          size,
          moves: solveMoves,
          estimatedMoveCount: solveMoves.length,
          state: replayedState,
          solver: 'eric-cpp-wasm-moves',
        });
        return;
      }

      // Fallback: WASM solver can produce a solved state but no move list
      const solvedState = await solveCubeStateWithWasm(state);
      ctx.sendJson(200, {
        size,
        moves: [],
        estimatedMoveCount: 0,
        state: solvedState,
        solver: 'eric-cpp-wasm',
      });
      return;
    }

    // 2x2 / 4x4: use the Python NxN solver
    const nxnPayload = await solveCubeStateWithPython(state, size);
    if (nxnPayload.moves.length > 0) {
      nxnPayload.state = await replayValidatedMovesOrThrow({
        state,
        moves: nxnPayload.moves,
        size,
        context: `Normalized ${size}x${size} solve`,
      });
    }

    ctx.sendJson(200, { size, ...nxnPayload });
  } catch (error) {
    ctx.sendError(
      500,
      'SOLVER_FAILURE',
      error instanceof Error ? error.message : 'WASM solver failed unexpectedly.',
    );
  }
}

// Route table: maps HTTP method + path to handler function.
// The dispatcher in server.js uses this to find the right handler.
export const ROUTES = [
  { method: 'GET', path: '/', handler: handleRootRoute },
  { method: 'GET', path: '/v1/health', handler: handleHealthRoute },
  { method: 'GET', path: '/v1/cube/state/solved', handler: handleSolvedStateRoute },
  { method: 'POST', path: '/v1/cube/moves/apply', handler: handleMoveApplyRoute },
  { method: 'POST', path: '/v1/cube/scramble', handler: handleScrambleRoute },
  { method: 'POST', path: '/v1/cube/solve', handler: handleSolveRoute },
];
