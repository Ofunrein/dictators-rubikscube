import {
  applyAuthPayload,
  clearAuthState,
  getAccessToken,
  getAuthSessionState,
  markAuthBootstrapped,
  subscribeAuthState,
  updateAuthUser,
} from './authSession.js';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

let refreshPromise = null;
let bootstrapPromise = null;

export class ApiError extends Error {
  constructor(message, { status, code, requestId, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateCubeState(state, name = 'state') {
  if (!isPlainObject(state)) {
    throw new Error(`${name} must be an object with U, R, F, D, L, B faces.`);
  }

  for (const face of FACE_ORDER) {
    if (!Array.isArray(state[face]) || state[face].length !== 9) {
      throw new Error(`${name}.${face} must contain exactly 9 stickers.`);
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
    details: error.details,
  });
}

function withQuery(path, query = {}) {
  const entries = Object.entries(query).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) {
    return path;
  }

  const params = new URLSearchParams(entries.map(([key, value]) => [key, String(value)]));
  return `${path}?${params.toString()}`;
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

async function request(path, options = {}) {
  const {
    method = 'GET',
    body,
    headers = {},
    auth = false,
    retryOnUnauthorized = true,
  } = options;

  const url = `${API_BASE_URL}${path}`;
  const requestHeaders = {
    accept: 'application/json',
    ...headers,
  };

  if (auth) {
    const token = getAccessToken();
    if (token) {
      requestHeaders.authorization = `Bearer ${token}`;
    }
  }

  const fetchOptions = {
    method,
    headers: requestHeaders,
    credentials: 'include',
  };

  if (body !== undefined) {
    fetchOptions.headers['content-type'] = 'application/json';
    fetchOptions.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch {
    throw new ApiError(`Unable to reach API at ${API_BASE_URL || window.location.origin}.`);
  }

  const payload = await parseJsonBody(response);
  if (!response.ok) {
    const error = buildApiError(payload, response.status);
    if (auth && retryOnUnauthorized && error.status === 401) {
      const refreshed = await refreshAuthSession();
      if (refreshed) {
        return request(path, {
          method,
          body,
          headers,
          auth,
          retryOnUnauthorized: false,
        });
      }
    }

    throw error;
  }

  return payload;
}

export function getAuthState() {
  return getAuthSessionState();
}

export function onAuthStateChange(listener) {
  return subscribeAuthState(listener);
}

export async function refreshAuthSession() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const payload = await request('/api/v1/auth/refresh', {
        method: 'POST',
        auth: false,
        retryOnUnauthorized: false,
      });
      applyAuthPayload(payload);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAuthState();
        return false;
      }
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function bootstrapAuthSession() {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    try {
      return await refreshAuthSession();
    } catch {
      markAuthBootstrapped();
      return false;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

export async function registerAccount({ email, username, password }) {
  const payload = await request('/api/v1/auth/register', {
    method: 'POST',
    body: { email, username, password },
    retryOnUnauthorized: false,
  });
  applyAuthPayload(payload);
  return payload;
}

export async function loginAccount({ identifier, password }) {
  const payload = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { identifier, password },
    retryOnUnauthorized: false,
  });
  applyAuthPayload(payload);
  return payload;
}

export async function logoutAccount() {
  await request('/api/v1/auth/logout', {
    method: 'POST',
    retryOnUnauthorized: false,
  });
  clearAuthState();
}

export async function fetchCurrentUser() {
  const payload = await request('/api/v1/auth/me', { auth: true });
  updateAuthUser(payload.user ?? null);
  return payload.user ?? null;
}

export async function pingBackend() {
  return request('/api/v1/health');
}

export async function fetchSolvedState() {
  const payload = await request('/api/v1/cube/state/solved');
  validateCubeState(payload.state, 'response.state');
  return payload.state;
}

export async function applyMoveRemote(state, move) {
  validateCubeState(state);
  if (typeof move !== 'string' || move.length === 0) {
    throw new Error('move must be a non-empty string.');
  }

  const payload = await request('/api/v1/cube/moves/apply', {
    method: 'POST',
    body: { state, move },
  });

  validateCubeState(payload.state, 'response.state');
  return payload;
}

export async function generateScrambleRemote({ length = 25, seed } = {}) {
  const body = {};
  if (length !== undefined) {
    body.length = length;
  }
  if (seed !== undefined) {
    body.seed = seed;
  }

  const payload = await request('/api/v1/cube/scramble', {
    method: 'POST',
    body,
  });

  if (!Array.isArray(payload.scramble)) {
    throw new ApiError('Backend returned an invalid scramble sequence.');
  }

  validateCubeState(payload.state, 'response.state');
  return payload;
}

export async function solveCubeRemote(state, strategy = 'beginner') {
  validateCubeState(state);

  const payload = await request('/api/v1/cube/solve', {
    method: 'POST',
    body: { state, strategy },
  });

  if (!Array.isArray(payload.moves)) {
    throw new ApiError('Backend returned an invalid solve response.');
  }

  return payload;
}

export async function requestAiHelp(payload) {
  if (!isPlainObject(payload)) {
    throw new Error('payload must be an object.');
  }

  const response = await request('/api/v1/ai/help', {
    method: 'POST',
    body: payload,
  });

  if (!isPlainObject(response.coachMessage) || typeof response.coachMessage.content !== 'string') {
    throw new ApiError('Backend returned an invalid AI help response.');
  }

  return response;
}

export async function listCubeSessions({ status, limit } = {}) {
  return request(withQuery('/api/v1/cube-sessions', { status, limit }), { auth: true });
}

export async function createCubeSession(payload) {
  return request('/api/v1/cube-sessions', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

export async function getCubeSession(id) {
  return request(`/api/v1/cube-sessions/${encodeURIComponent(id)}`, { auth: true });
}

export async function updateCubeSession(id, payload) {
  return request(`/api/v1/cube-sessions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
    auth: true,
  });
}

export async function completeCubeSession(id, payload = {}) {
  return request(`/api/v1/cube-sessions/${encodeURIComponent(id)}/complete`, {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

export async function fetchSolveRecords({ limit } = {}) {
  return request(withQuery('/api/v1/solve-records', { limit }), { auth: true });
}

export async function fetchStatsSummary() {
  return request('/api/v1/stats/summary', { auth: true });
}
