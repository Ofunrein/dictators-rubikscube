/**
 * api.ts — Frontend HTTP client for the Rubik's Cube API
 */

import { getFaceSize, normalizeCubeSize, type CubeStateObj } from '../cube/cubeModel.js';
import { isPlainObject } from '../utils/isPlainObject.js';

const API_BASE_URL = ((import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? '').replace(/\/+$/, '');
const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

class ApiError extends Error {
  status?: number;
  code?: string;
  requestId?: string;
  details?: unknown;

  constructor(
    message: string,
    { status, code, requestId, details }: {
      status?: number;
      code?: string;
      requestId?: string;
      details?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

function validateCubeState(state: unknown, name: string = 'state', expectedSize?: number): void {
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
  const stateRecord = state as Record<string, unknown>;
  for (const face of FACE_ORDER) {
    if (!Array.isArray(stateRecord[face]) || (stateRecord[face] as unknown[]).length !== stickerCount) {
      throw new Error(`${name}.${face} must contain exactly ${stickerCount} stickers.`);
    }
  }
}

function buildApiError(payload: unknown, statusCode: number): ApiError {
  const error = isPlainObject(payload) ? (payload as Record<string, unknown>)['error'] : undefined;
  if (!isPlainObject(error)) {
    return new ApiError(`Request failed with status ${statusCode}.`, { status: statusCode });
  }

  const errorRecord = error as Record<string, unknown>;
  let message = (errorRecord['message'] as string | undefined) || `Request failed with status ${statusCode}.`;
  if (Array.isArray(errorRecord['details']) && errorRecord['details'].length > 0) {
    const detailSummary = (errorRecord['details'] as Array<{ path: string; message: string }>)
      .map((detail) => `${detail.path}: ${detail.message}`)
      .join('; ');
    message = `${message} ${detailSummary}`;
  }

  return new ApiError(message, {
    status: statusCode,
    code: errorRecord['code'] as string | undefined,
    requestId: errorRecord['requestId'] as string | undefined,
    details: errorRecord['details'],
  });
}

async function parseJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new ApiError('Backend returned invalid JSON.', { status: response.status });
  }
}

async function request(
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
): Promise<Record<string, unknown>> {
  const url = `${API_BASE_URL}${path}`;
  const options: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: {
      accept: 'application/json',
    },
  };

  if (body !== undefined) {
    options.headers['content-type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response: Response;
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

export async function pingBackend(): Promise<Record<string, unknown>> {
  return request('/api/v1/health');
}

export async function fetchSolvedState(size: number = 3): Promise<Record<string, unknown>> {
  const normalizedSize = normalizeCubeSize(size);
  const payload = await request(`/api/v1/cube/state/solved?size=${normalizedSize}`);
  validateCubeState(payload['state'], 'response.state', normalizedSize);
  return payload;
}

export async function applyMoveRemote(
  state: CubeStateObj,
  move: string,
  size?: number,
): Promise<Record<string, unknown>> {
  validateCubeState(state);
  const normalizedSize = normalizeCubeSize(size ?? getFaceSize(state));
  validateCubeState(state, 'state', normalizedSize);
  if (typeof move !== 'string' || move.length === 0) {
    throw new Error('move must be a non-empty string.');
  }

  const payload = await request('/api/v1/cube/moves/apply', {
    method: 'POST',
    body: { size: normalizedSize, state, move },
  });

  validateCubeState(payload['state'], 'response.state', normalizedSize);
  return payload;
}

export async function generateScrambleRemote(
  { size = 3, length, seed }: { size?: number; length?: number; seed?: number } = {},
): Promise<Record<string, unknown>> {
  const normalizedSize = normalizeCubeSize(size);
  const body: Record<string, unknown> = { size: normalizedSize };
  if (length !== undefined) {
    body['length'] = length;
  }
  if (seed !== undefined) {
    body['seed'] = seed;
  }

  const payload = await request('/api/v1/cube/scramble', {
    method: 'POST',
    body,
  });

  if (!Array.isArray(payload['scramble'])) {
    throw new ApiError('Backend returned an invalid scramble sequence.');
  }

  validateCubeState(payload['state'], 'response.state', normalizedSize);
  return payload;
}

export async function solveCubeRemote(
  state: CubeStateObj,
  strategy: string = 'beginner',
  size?: number,
  history?: string[],
): Promise<Record<string, unknown>> {
  validateCubeState(state);
  const normalizedSize = normalizeCubeSize(size ?? getFaceSize(state));
  validateCubeState(state, 'state', normalizedSize);

  const isLocalDev = !!import.meta.env['DEV'];
  const KOCIEMBA_THRESHOLD = 10;
  const hasSliceMoves = Array.isArray(history) && history.some((m) => /^[MESmes]/.test(m));
  const isShortHistory = Array.isArray(history) && history.length > 0 && history.length <= KOCIEMBA_THRESHOLD && !hasSliceMoves;
  // Short 3x3 scrambles (≤10 moves, no slice moves) use kociemba via the Python serverless.
  // Long scrambles and local dev fall back to WASM via /api/v1/cube/solve.
  const endpoint = (!isLocalDev && (normalizedSize === 2 || (normalizedSize === 3 && isShortHistory)))
    ? '/api/nxn-solve'
    : '/api/v1/cube/solve';

  const payload = await request(endpoint, {
    method: 'POST',
    body: {
      size: normalizedSize,
      state,
      strategy,
      ...(history !== undefined ? { moveHistory: history } : {}),
    },
  });

  if (!Array.isArray(payload['moves'])) {
    throw new ApiError('Backend returned an invalid solve response.');
  }

  if (payload['state'] !== undefined) {
    validateCubeState(payload['state'], 'response.state', normalizedSize);
  }

  return payload;
}

export async function requestAiHelp(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!isPlainObject(payload)) {
    throw new Error('AI help payload must be an object.');
  }

  const response = await request('/api/v1/ai/help', {
    method: 'POST',
    body: payload,
  });

  const coachMessage = response['coachMessage'];
  if (!isPlainObject(coachMessage) || typeof (coachMessage as Record<string, unknown>)['content'] !== 'string') {
    throw new ApiError('Backend returned an invalid AI help response.');
  }

  return response;
}

export async function requestAiMoveValidation(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!isPlainObject(payload)) {
    throw new Error('AI move validation payload must be an object.');
  }

  if (!isPlainObject(payload['state'])) {
    throw new Error('AI move validation payload requires state.');
  }

  const response = await request('/api/v1/ai/move/validate', {
    method: 'POST',
    body: payload,
  });

  const validation = response['validation'];
  if (!isPlainObject(validation) || typeof (validation as Record<string, unknown>)['reason'] !== 'string') {
    throw new ApiError('Backend returned an invalid AI move validation response.');
  }

  return response;
}
