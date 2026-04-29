/**
 * validation.js — Request validation for the size-aware cube API
 *
 * Every POST route (apply move, scramble, solve) needs to validate the incoming
 * JSON before passing it to the cube engine. This file centralizes those checks.
 *
 * The pattern:
 *   Each validate*() function returns either:
 *     { ok: true, value: { ... cleaned fields ... } }   → safe to use
 *     { ok: false, details: [ { path, message } ... ] } → send 400 error
 *
 *   The "details" array lists every problem found (not just the first one),
 *   so the frontend can show all validation errors at once.
 *
 * Why size is always required:
 *   The API supports 2x2, 3x3, and 4x4. Each size has different valid moves
 *   and different sticker counts per face. The size field tells the validator
 *   which rules to apply.
 */

import {
  SUPPORTED_CUBE_SIZES,
  cloneCubeState,
  collectCubeStateDetails,
  getDefaultScrambleLength,
  getSupportedMoveTokens,
  isPlainObject,
  isSupportedMove,
  normalizeCubeSize,
} from './cube.js';

const ALLOWED_STRATEGIES = new Set(['beginner', 'cfop']);

function findUnknownKeys(value, allowedKeys) {
  return Object.keys(value).filter((key) => !allowedKeys.includes(key));
}

function validateSize(value, path = 'size') {
  if (!Number.isInteger(value)) {
    return [{ path, message: 'size must be an integer.' }];
  }

  if (!SUPPORTED_CUBE_SIZES.includes(value)) {
    return [{
      path,
      message: `size must be one of ${SUPPORTED_CUBE_SIZES.join(', ')}.`,
    }];
  }

  return [];
}

function readRequiredSize(payload, details) {
  if (!Object.hasOwn(payload, 'size')) {
    details.push({ path: 'size', message: 'size is required.' });
    return null;
  }

  const numericSize = Number(payload.size);
  details.push(...validateSize(numericSize));
  return details.length === 0 ? normalizeCubeSize(numericSize) : null;
}

export function validateCubeState(candidate, size, path = 'state') {
  return collectCubeStateDetails(candidate, size, path);
}

export function validateMoveApplyRequest(payload) {
  const details = [];
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }]
    };
  }

  const unknown = findUnknownKeys(payload, ['size', 'state', 'move']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  const size = readRequiredSize(payload, details);

  if (!Object.hasOwn(payload, 'state')) {
    details.push({ path: 'state', message: 'state is required.' });
  } else {
    details.push(...validateCubeState(payload.state, size ?? undefined, 'state'));
  }

  if (!Object.hasOwn(payload, 'move')) {
    details.push({ path: 'move', message: 'move is required.' });
  } else if (size !== null && !isSupportedMove(payload.move, size)) {
    details.push({
      path: 'move',
      message: `Move must be one of ${getSupportedMoveTokens(size).join(', ')}.`,
    });
  }

  if (details.length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      size,
      state: cloneCubeState(payload.state),
      move: payload.move,
    },
  };
}

export function validateScrambleRequest(payload) {
  const body = payload ?? {};
  if (!isPlainObject(body)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }]
    };
  }

  const details = [];
  const unknown = findUnknownKeys(body, ['size', 'length', 'seed']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  const size = readRequiredSize(body, details);

  let length = size === null ? 25 : getDefaultScrambleLength(size);
  if (Object.hasOwn(body, 'length')) {
    if (!Number.isInteger(body.length)) {
      details.push({ path: 'length', message: 'length must be an integer.' });
    } else if (body.length < 1 || body.length > 100) {
      details.push({ path: 'length', message: 'length must be between 1 and 100.' });
    } else {
      length = body.length;
    }
  }

  let seed;
  if (Object.hasOwn(body, 'seed')) {
    if (!Number.isInteger(body.seed)) {
      details.push({ path: 'seed', message: 'seed must be an integer.' });
    } else if (body.seed < 0 || body.seed > 2147483647) {
      details.push({ path: 'seed', message: 'seed must be between 0 and 2147483647.' });
    } else {
      seed = body.seed;
    }
  }

  if (details.length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      size,
      length,
      seed,
    },
  };
}

export function validateSolveRequest(payload) {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }]
    };
  }

  const details = [];
  const unknown = findUnknownKeys(payload, ['size', 'state', 'strategy']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  const size = readRequiredSize(payload, details);

  if (!Object.hasOwn(payload, 'state')) {
    details.push({ path: 'state', message: 'state is required.' });
  } else {
    details.push(...validateCubeState(payload.state, size ?? undefined, 'state'));
  }

  let strategy = 'beginner';
  if (Object.hasOwn(payload, 'strategy')) {
    if (typeof payload.strategy !== 'string' || !ALLOWED_STRATEGIES.has(payload.strategy)) {
      details.push({ path: 'strategy', message: 'strategy must be one of beginner, cfop.' });
    } else {
      strategy = payload.strategy;
    }
  }

  if (details.length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      size,
      state: cloneCubeState(payload.state),
      strategy,
    },
  };
}
