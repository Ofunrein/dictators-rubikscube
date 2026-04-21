/**
 * api.js — Frontend HTTP client for the Rubik's Cube API
 *
 * This is the networking layer. Every time the simulator needs to talk to the
 * backend (scramble, solve, apply a move), it goes through a function in this file.
 *
 * Endpoints this client talks to:
 *   GET  /api/v1/health              → is the server alive?
 *   GET  /api/v1/cube/state/solved   → what does a solved cube look like?
 *   POST /api/v1/cube/moves/apply    → apply one move to a state, return the new state
 *   POST /api/v1/cube/scramble       → generate a random scramble and return the scrambled state
 *   POST /api/v1/cube/solve          → send a cube state, get back the solution (moves or solved state)
 *
 * In production (Vercel), these routes are handled by api/v1/[...path].js.
 * In local dev, Vite proxies them to the Node.js dev server on port 5200.
 *
 * Error handling: if a request fails, an ApiError is thrown with the status code,
 * error code, and any validation details from the backend.
 */

import { getFaceSize, normalizeCubeSize } from '../cube/cubeModel.js';
import { isPlainObject } from '../utils/isPlainObject.js';

// Production uses the repo-root Vercel route at /api/v1/*.
// Local dev keeps the frontend on :5400 and the Node API on :5200,
// with Vite proxying /api/v1/* -> http://localhost:5200/v1/*.
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

class ApiError extends Error {
  constructor(message, { status, code, requestId, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

function validateCubeState(state, name = 'state', expectedSize) {
  if (!isPlainObject(state)) {
    throw new Error(`${name} must be an object with U, R, F, D, L, B faces.`);
  }

  const detectedSize = getFaceSize(state);
  if (!detectedSize) {
    throw new Error(`${name} must describe a square cube face layout.`);
  }

  const normalizedExpectedSize =
    expectedSize === undefined ? detectedSize : normalizeCubeSize(expectedSize);

  if (detectedSize !== normalizedExpectedSize) {
    throw new Error(`${name} must match a ${normalizedExpectedSize}x${normalizedExpectedSize} cube.`);
  }

  const stickerCount = normalizedExpectedSize * normalizedExpectedSize;
  for (const face of FACE_ORDER) {
    if (!Array.isArray(state[face]) || state[face].length !== stickerCount) {
      throw new Error(`${name}.${face} must contain exactly ${stickerCount} stickers.`);
    }
  }
}

function buildApiError(payload, statusCode) {
  const error = isPlainObject(payload) ? payload.error : undefined;
  if (!isPlainObject(error)) {
    return new ApiError(`Request failed with status ${statusCode}.`, { status: statusCode });
  }

  let message = error.message || `Request failed with status ${statusCode}.`;
  if (Array.isArray(error.details) && error.details.length > 0) {
    const detailSummary = error.details
      .map((detail) => `${detail.path}: ${detail.message}`)
      .join('; ');
    message = `${message} ${detailSummary}`;
  }

  return new ApiError(message, {
    status: statusCode,
    code: error.code,
    requestId: error.requestId,
    details: error.details
  });
}

async function parseJsonBody(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError('Backend returned invalid JSON.', { status: response.status });
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const url = `${API_BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      accept: 'application/json'
    }
  };

  if (body !== undefined) {
    options.headers['content-type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new ApiError(`Unable to reach API at ${API_BASE_URL || window.location.origin}.`);
  }

  const payload = await parseJsonBody(response);
  if (!response.ok) {
    throw buildApiError(payload, response.status);
  }

  return payload;
}

export async function pingBackend() {
  return request('/api/v1/health');
}

export async function fetchSolvedState(size = 3) {
  const normalizedSize = normalizeCubeSize(size);
  const payload = await request(`/api/v1/cube/state/solved?size=${normalizedSize}`);
  validateCubeState(payload.state, 'response.state', normalizedSize);
  return payload;
}

export async function applyMoveRemote(state, move, size) {
  validateCubeState(state);
  const normalizedSize = normalizeCubeSize(size ?? getFaceSize(state));
  validateCubeState(state, 'state', normalizedSize);
  if (typeof move !== 'string' || move.length === 0) {
    throw new Error('move must be a non-empty string.');
  }

  const payload = await request('/api/v1/cube/moves/apply', {
    method: 'POST',
    body: { size: normalizedSize, state, move }
  });

  validateCubeState(payload.state, 'response.state', normalizedSize);
  return payload;
}

export async function generateScrambleRemote({ size = 3, length, seed } = {}) {
  const normalizedSize = normalizeCubeSize(size);
  const body = { size: normalizedSize };
  if (length !== undefined) {
    body.length = length;
  }
  if (seed !== undefined) {
    body.seed = seed;
  }

  const payload = await request('/api/v1/cube/scramble', {
    method: 'POST',
    body
  });

  if (!Array.isArray(payload.scramble)) {
    throw new ApiError('Backend returned an invalid scramble sequence.');
  }

  validateCubeState(payload.state, 'response.state', normalizedSize);
  return payload;
}

export async function solveCubeRemote(state, strategy = 'beginner', size) {
  validateCubeState(state);
  const normalizedSize = normalizeCubeSize(size ?? getFaceSize(state));
  validateCubeState(state, 'state', normalizedSize);

  // Routing by size:
  //   2x2 → /api/nxn-solve  (Python serverless, rubikscubennnsolver)
  //   3x3 → /api/v1/cube/solve  (Node.js, Eric's C++ WASM solver)
  // A blanket vercel.json rewrite was tried but broke 3x3 (kociemba invalid state).
  // Explicit routing here keeps the two solver paths cleanly separated.
  const endpoint = normalizedSize === 2 ? '/api/nxn-solve' : '/api/v1/cube/solve';

  const payload = await request(endpoint, {
    method: 'POST',
    body: { size: normalizedSize, state, strategy }
  });

  if (!Array.isArray(payload.moves)) {
    throw new ApiError('Backend returned an invalid solve response.');
  }

  if (payload.state !== undefined) {
    validateCubeState(payload.state, 'response.state', normalizedSize);
  }

  return payload;
}
