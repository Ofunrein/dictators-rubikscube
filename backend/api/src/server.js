import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { applyMoveToState, applyMoves, createSolvedState, FACE_ORDER, generateScramble } from './cube.js';
import {
  validateMoveApplyRequest,
  validateScrambleRequest,
  validateSolveRequest
} from './validation.js';

const PORT = Number(process.env.API_PORT ?? 4011);
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

  if (req.method === 'GET' && pathname === '/v1/health') {
    sendJson(res, 200, {
      ok: true,
      service: SERVICE_NAME,
      version: VERSION,
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/v1/cube/state/solved') {
    sendJson(res, 200, { state: createSolvedState() });
    return;
  }

  if (req.method === 'POST' && pathname === '/v1/cube/moves/apply') {
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

  if (req.method === 'POST' && pathname === '/v1/cube/scramble') {
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

    const { length, seed } = validation.value;
    const scramble = generateScramble(length, seed);
    const state = applyMoves(createSolvedState(), scramble);

    sendJson(res, 200, { scramble, state });
    return;
  }

  if (req.method === 'POST' && pathname === '/v1/cube/solve') {
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

    sendJson(res, 200, {
      moves: alreadySolved ? [] : ["R'", "U'", 'F'],
      estimatedMoveCount: alreadySolved ? 0 : 3,
      isMock: true,
      note: alreadySolved
        ? 'Cube is already solved; returning an empty solution.'
        : 'Solver implementation is stubbed in Sprint 2 and currently returns a placeholder response.'
    });
    return;
  }

  sendError(res, 404, requestId, 'NOT_FOUND', 'Route not found.');
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch(() => {
    const requestId = randomUUID();
    sendError(res, 500, requestId, 'INTERNAL_ERROR', 'Unexpected server error.');
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API skeleton listening on http://localhost:${PORT}`);
});
