/**
 * server.js — Local development API server
 *
 * This is the Node.js HTTP server that runs during local development (npm run dev).
 * It handles the exact same routes as the Vercel serverless function (api/v1/[...path].js)
 * but runs as a normal long-lived process on your machine instead of a cloud function.
 *
 * Routes (same as production):
 *   GET  /v1/health              → health check
 *   GET  /v1/cube/state/solved   → returns solved cube state
 *   POST /v1/cube/moves/apply    → apply a move to a state
 *   POST /v1/cube/scramble       → generate a scramble
 *   POST /v1/cube/solve          → solve the cube via WASM (Eric's C++ solver)
 *
 * Starts on port 5200 by default (set API_PORT env var to change).
 * The frontend dev server (Vite on port 5173) proxies /api/v1/* requests here.
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { applyMoveToState, applyMoves, createSolvedState, FACE_ORDER, generateScramble } from './cube.js';
import {
  validateMoveApplyRequest,
  validateScrambleRequest,
  validateSolveRequest
} from './validation.js';
import { scrambleCubeWithWasm, solveCubeMoveListWithWasm, solveCubeStateWithWasm } from './wasmSolver.js';

const PORT = Number(process.env.API_PORT ?? 5200);
const SERVICE_NAME = 'rubiks-api';
const VERSION = '0.1.0';
const MAX_BODY_BYTES = 1_000_000;

function withCorsHeaders(headers = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    ...headers
  };
}

function sendJson(res, statusCode, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(
    statusCode,
    withCorsHeaders({
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(body),
      ...headers
    })
  );
  res.end(body);
}

function sendNoContent(res) {
  res.writeHead(204, withCorsHeaders());
  res.end();
}

function sendError(res, statusCode, requestId, code, message, details) {
  const error = { code, message, requestId };
  if (details && details.length > 0) {
    error.details = details;
  }
  sendJson(res, statusCode, { error });
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      resolve({});
      return;
    }

    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Payload too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body.'));
      }
    });

    req.on('error', () => {
      reject(new Error('Failed to read request body.'));
    });
  });
}

function isSolvedState(state) {
  return FACE_ORDER.every((face) => state[face].every((sticker) => sticker === state[face][0]));
}

async function handleRequest(req, res) {
  const requestId = randomUUID();

  if (req.method === 'OPTIONS') {
    sendNoContent(res);
    return;
  }

  if (!req.url) {
    sendError(res, 400, requestId, 'BAD_REQUEST', 'Request URL is missing.');
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;
  const routePath = pathname.startsWith('/api/v1') ? pathname.replace(/^\/api/, '') : pathname;

  if (req.method === 'GET' && pathname === '/') {
    sendJson(res, 200, {
      ok: true,
      service: SERVICE_NAME,
      version: VERSION,
      message: 'Rubiks API dev server is running. Vite stays on 5400, API stays on 5200. Use /v1/* or /api/v1/* locally.'
    });
    return;
  }

  if (req.method === 'GET' && routePath === '/v1/health') {
    sendJson(res, 200, {
      ok: true,
      service: SERVICE_NAME,
      version: VERSION,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === 'GET' && routePath === '/v1/cube/state/solved') {
    sendJson(res, 200, { state: createSolvedState() });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/cube/moves/apply') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendError(res, 400, requestId, 'BAD_REQUEST', error.message);
      return;
    }

    const validation = validateMoveApplyRequest(body);
    if (!validation.ok) {
      sendError(res, 400, requestId, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
      return;
    }

    const { state, move } = validation.value;
    const nextState = applyMoveToState(state, move);
    sendJson(res, 200, {
      state: nextState,
      appliedMove: move
    });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/cube/scramble') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendError(res, 400, requestId, 'BAD_REQUEST', error.message);
      return;
    }

    const validation = validateScrambleRequest(body);
    if (!validation.ok) {
      sendError(res, 400, requestId, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
      return;
    }

    const { length } = validation.value;

    // Try Eric's C++ scramble via WASM first — better randomness and anti-cancel logic.
    // Falls back to the JS scramble if WASM fails.
    try {
      const state = await scrambleCubeWithWasm(length);
      sendJson(res, 200, { scramble: [], state, scrambler: 'eric-cpp-wasm' });
      return;
    } catch (wasmError) {
      console.warn('[scramble] WASM scramble failed, falling back to JS:', wasmError.message);
    }

    // JS fallback — still works, just less sophisticated randomness
    const scramble = generateScramble(length);
    const state = applyMoves(createSolvedState(), scramble);
    sendJson(res, 200, { scramble, state, scrambler: 'js-fallback' });
    return;
  }

  if (req.method === 'POST' && routePath === '/v1/cube/solve') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      sendError(res, 400, requestId, 'BAD_REQUEST', error.message);
      return;
    }

    const validation = validateSolveRequest(body);
    if (!validation.ok) {
      sendError(res, 400, requestId, 'VALIDATION_ERROR', 'Request body failed validation.', validation.details);
      return;
    }

    const { state } = validation.value;
    const alreadySolved = isSolvedState(state);

    if (alreadySolved) {
      sendJson(res, 200, {
        moves: [],
        estimatedMoveCount: 0,
        state
      });
      return;
    }

    try {
      // First ask the solver for a move list so the frontend can animate the real solve.
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

      // If move replay is unavailable or does not land on a solved cube, fall back
      // to the solved-state export so the API still returns a correct end state.
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
        requestId,
        'SOLVER_FAILURE',
        error instanceof Error ? error.message : 'WASM solver failed unexpectedly.'
      );
    }
    return;
  }

  sendError(res, 404, requestId, 'NOT_FOUND', 'Route not found.');
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch(() => {
    const requestId = randomUUID();
    // Keep the outer catch narrow and consistent so unexpected crashes still
    // come back as JSON instead of dropping the connection.
    sendError(res, 500, requestId, 'INTERNAL_ERROR', 'Unexpected server error.');
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API skeleton listening on http://localhost:${PORT}`);
});
