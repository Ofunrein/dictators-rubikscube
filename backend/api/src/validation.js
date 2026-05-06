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
 * Why size is preferred:
 *   The API supports 2x2, 3x3, and 4x4. Each size has different valid moves
 *   and sticker counts. Newer clients should send size explicitly; legacy 3x3
 *   callers are still accepted by inferring size from the cube state.
 */

import {
  SUPPORTED_CUBE_SIZES,
  cloneCubeState,
  collectCubeStateDetails,
  getDefaultScrambleLength,
  getFaceSize,
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

function readOptionalSize(payload, details, fallbackSize = 3) {
  if (!Object.hasOwn(payload, 'size')) {
    return fallbackSize;
  }

  const priorDetailCount = details.length;
  const numericSize = Number(payload.size);
  details.push(...validateSize(numericSize));
  return details.length === priorDetailCount ? normalizeCubeSize(numericSize) : null;
}

function readSizeFromStateOrDefault(payload, details) {
  if (Object.hasOwn(payload, 'size')) {
    return readOptionalSize(payload, details);
  }

  if (Object.hasOwn(payload, 'state')) {
    const detectedSize = getFaceSize(payload.state);
    if (detectedSize) {
      return detectedSize;
    }
  }

  return 3;
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

  const size = readSizeFromStateOrDefault(payload, details);

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

  const size = readOptionalSize(body, details);

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
  const unknown = findUnknownKeys(payload, ['size', 'state', 'strategy', 'moveHistory']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  const size = readSizeFromStateOrDefault(payload, details);

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

  let moveHistory;
  if (Object.hasOwn(payload, 'moveHistory')) {
    if (!Array.isArray(payload.moveHistory)) {
      details.push({ path: 'moveHistory', message: 'moveHistory must be an array of move tokens.' });
    } else if (payload.moveHistory.length > 10000) {
      details.push({ path: 'moveHistory', message: 'moveHistory must contain at most 10000 items.' });
    } else if (size !== null) {
      moveHistory = [];
      for (let index = 0; index < payload.moveHistory.length; index += 1) {
        const item = payload.moveHistory[index];
        if (typeof item !== 'string') {
          details.push({ path: `moveHistory[${index}]`, message: 'Value must be a string.' });
          continue;
        }

        const token = item.trim();
        if (!isSupportedMove(token, size)) {
          details.push({
            path: `moveHistory[${index}]`,
            message: `Move token must be one of ${getSupportedMoveTokens(size).join(', ')}.`,
          });
          continue;
        }

        moveHistory.push(token);
      }
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
      ...(moveHistory ? { moveHistory } : {}),
    },
  };
}
