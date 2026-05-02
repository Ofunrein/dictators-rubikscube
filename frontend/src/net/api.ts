/**
 * api.ts — Frontend HTTP client for the Rubik's Cube API
 *
 * Every time the simulator needs to talk to the backend (scramble, solve,
 * apply a move), it goes through a function in this file.
 *
 * Endpoints:
 *   GET  /api/v1/health              → is the server alive?
 *   GET  /api/v1/cube/state/solved   → what does a solved cube look like?
 *   POST /api/v1/cube/moves/apply    → apply one move to a state
 *   POST /api/v1/cube/scramble       → generate a random scramble
 *   POST /api/v1/cube/solve          → send a cube state, get back the solution
 *
 * In production (Vercel), routes are handled by api/v1/[...path].js.
 * In local dev, Vite proxies them to the Node.js dev server on port 5200.
 */

import { CubeState, getFaceSize, normalizeCubeSize } from '../cube/cubeModel.js';
import { isPlainObject } from '../utils/isPlainObject.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiErrorOptions {
  status?: number;
  code?: string;
  requestId?: string;
  details?: ValidationDetail[];
}

export interface ValidationDetail {
  path: string;
  message: string;
}

export interface HealthResponse {
  ok: boolean;
  service: string;
  version: string;
  timestamp: string;
}

export interface SolvedStateResponse {
  size: number;
  state: CubeState;
}

export interface ApplyMoveResponse {
  appliedMove: string;
  state: CubeState;
}

export interface ScrambleResponse {
  scramble: string[];
  state: CubeState;
  scrambler: string;
}

export interface SolveResponse {
  moves: string[];
  state?: CubeState;
  solver: string;
  estimatedMoveCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'] as const;

// ─── ApiError ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status?: number;
  code?: string;
  requestId?: string;
  details?: ValidationDetail[];

  constructor(message: string, { status, code, requestId, details }: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function validateCubeState(state: unknown, name = 'state', expectedSize?: number): void {
  if (!isPlainObject(state)) throw new Error(`${name} must be an object with U, R, F, D, L, B faces.`);

  const detectedSize = getFaceSize(state);
  if (!detectedSize) throw new Error(`${name} must describe a square cube face layout.`);

  const normalizedExpectedSize = expectedSize === undefined ? detectedSize : normalizeCubeSize(expectedSize);
  if (detectedSize !== normalizedExpectedSize) {
    throw new Error(`${name} must match a ${normalizedExpectedSize}x${normalizedExpectedSize} cube.`);
  }

  const stickerCount = normalizedExpectedSize * normalizedExpectedSize;
  for (const face of FACE_ORDER) {
    const s = state as Record<string, unknown>;
    if (!Array.isArray(s[face]) || (s[face] as unknown[]).length !== stickerCount) {
      throw new Error(`${name}.${face} must contain exactly ${stickerCount} stickers.`);
    }
  }
}

function buildApiError(payload: unknown, statusCode: number): ApiError {
  const error = isPlainObject(payload) ? (payload as Record<string, unknown>).error : undefined;
  if (!isPlainObject(error)) {
    return new ApiError(`Request failed with status ${statusCode}.`, { status: statusCode });
  }

  const e = error as Record<string, unknown>;
  let message = (e.message as string) || `Request failed with status ${statusCode}.`;
  if (Array.isArray(e.details) && e.details.length > 0) {
    const detailSummary = (e.details as ValidationDetail[]).map((d) => `${d.path}: ${d.message}`).join('; ');
    message = `${message} ${detailSummary}`;
  }

  return new ApiError(message, {
    status: statusCode,
    code: e.code as string | undefined,
    requestId: e.requestId as string | undefined,
    details: e.details as ValidationDetail[] | undefined,
  });
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError('Backend returned invalid JSON.', { status: response.status });
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

async function request(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<unknown> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = { accept: 'application/json' };
  const options: RequestInit = { method, headers };

  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new ApiError(`Unable to reach API at ${API_BASE_URL || window.location.origin}.`);
  }

  const payload = await parseJsonBody(response);
  if (!response.ok) throw buildApiError(payload, response.status);
  return payload;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function pingBackend(): Promise<HealthResponse> {
  return request('/api/v1/health') as Promise<HealthResponse>;
}

export async function fetchSolvedState(size: number = 3): Promise<SolvedStateResponse> {
  const normalizedSize = normalizeCubeSize(size);
  const payload = await request(`/api/v1/cube/state/solved?size=${normalizedSize}`) as SolvedStateResponse;
  validateCubeState(payload.state, 'response.state', normalizedSize);
  return payload;
}

export async function applyMoveRemote(state: CubeState, move: string, size?: number): Promise<ApplyMoveResponse> {
  validateCubeState(state);
  const normalizedSize = normalizeCubeSize(size ?? getFaceSize(state)!);
  validateCubeState(state, 'state', normalizedSize);
  if (typeof move !== 'string' || move.length === 0) throw new Error('move must be a non-empty string.');

  const payload = await request('/api/v1/cube/moves/apply', { method: 'POST', body: { size: normalizedSize, state, move } }) as ApplyMoveResponse;
  validateCubeState(payload.state, 'response.state', normalizedSize);
  return payload;
}

export interface ScrambleOptions {
  size?: number;
  length?: number;
  seed?: number;
}

export async function generateScrambleRemote({ size = 3, length, seed }: ScrambleOptions = {}): Promise<ScrambleResponse> {
  const normalizedSize = normalizeCubeSize(size);
  const body: Record<string, unknown> = { size: normalizedSize };
  if (length !== undefined) body.length = length;
  if (seed !== undefined) body.seed = seed;

  const payload = await request('/api/v1/cube/scramble', { method: 'POST', body }) as ScrambleResponse;
  if (!Array.isArray(payload.scramble)) throw new ApiError('Backend returned an invalid scramble sequence.');
  validateCubeState(payload.state, 'response.state', normalizedSize);
  return payload;
}

export async function solveCubeRemote(
  state: CubeState,
  strategy: string = 'beginner',
  size?: number,
  history?: string[],
): Promise<SolveResponse> {
  validateCubeState(state);
  const normalizedSize = normalizeCubeSize(size ?? getFaceSize(state)!);
  validateCubeState(state, 'state', normalizedSize);

  const isLocalDev = import.meta.env.DEV as boolean | undefined;
  const endpoint = (!isLocalDev && normalizedSize === 2) ? '/api/nxn-solve' : '/api/v1/cube/solve';

  const payload = await request(endpoint, {
    method: 'POST',
    body: { size: normalizedSize, state, strategy, ...(history !== undefined ? { history } : {}) },
  }) as SolveResponse;

  if (!Array.isArray(payload.moves)) throw new ApiError('Backend returned an invalid solve response.');
  if (payload.state !== undefined) validateCubeState(payload.state, 'response.state', normalizedSize);
  return payload;
}
