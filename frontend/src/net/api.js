const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4011').replace(/\/+$/, '');
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
    throw new ApiError(`Unable to reach API at ${API_BASE_URL}.`);
  }

  const payload = await parseJsonBody(response);
  if (!response.ok) {
    throw buildApiError(payload, response.status);
  }

  return payload;
}

export async function pingBackend() {
  return request('/v1/health');
}

export async function fetchSolvedState() {
  const payload = await request('/v1/cube/state/solved');
  validateCubeState(payload.state, 'response.state');
  return payload.state;
}

export async function applyMoveRemote(state, move) {
  validateCubeState(state);
  if (typeof move !== 'string' || move.length === 0) {
    throw new Error('move must be a non-empty string.');
  }

  const payload = await request('/v1/cube/moves/apply', {
    method: 'POST',
    body: { state, move }
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

  const payload = await request('/v1/cube/scramble', {
    method: 'POST',
    body
  });

  if (!Array.isArray(payload.scramble)) {
    throw new ApiError('Backend returned an invalid scramble sequence.');
  }

  validateCubeState(payload.state, 'response.state');
  return payload;
}

export async function solveCubeRemote(state, strategy = 'beginner') {
  validateCubeState(state);

  const payload = await request('/v1/cube/solve', {
    method: 'POST',
    body: { state, strategy }
  });

  if (!Array.isArray(payload.moves)) {
    throw new ApiError('Backend returned an invalid solve response.');
  }

  return payload;
}
