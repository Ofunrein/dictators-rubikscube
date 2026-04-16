/**
 * validation.js — Request validation for all API endpoints
 *
 * Before the API processes any request, it runs through these validators to make
 * sure the input is well-formed. This prevents crashes from bad data and gives
 * clear error messages back to the frontend.
 *
 * Each validator returns { ok: true, value: ... } on success or
 * { ok: false, details: [...] } on failure (with specific error messages).
 *
 * Validators:
 *   validateMoveApplyRequest(body)  → checks { state, move } is valid
 *   validateScrambleRequest(body)   → checks { length?, seed? } is valid
 *   validateSolveRequest(body)      → checks { state, strategy? } is valid
 *
 * What gets validated:
 *   - state must be an object with exactly 6 faces (U, R, F, D, L, B)
 *   - each face must have exactly 9 sticker tokens (W, R, G, Y, O, B)
 *   - move must be a recognized move token from the MOVES list
 *   - scramble length must be between 1 and 100
 *   - strategy must be "beginner" or "cfop" (defaults to "beginner")
 */

import { FACE_ORDER, MOVE_TOKENS, cloneCubeState, isStickerToken, isSupportedMove } from './cube.js';

const FACE_SET = new Set(FACE_ORDER);
const ALLOWED_STRATEGIES = new Set(['beginner', 'cfop']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function findUnknownKeys(value, allowedKeys) {
  return Object.keys(value).filter((key) => !allowedKeys.includes(key));
}

export function validateCubeState(candidate, path = 'state') {
  const details = [];

  if (!isPlainObject(candidate)) {
    details.push({
      path,
      message: 'Cube state must be an object with U, R, F, D, L, B faces.'
    });
    return details;
  }

  const unknownFaces = Object.keys(candidate).filter((key) => !FACE_SET.has(key));
  for (const face of unknownFaces) {
    details.push({ path: `${path}.${face}`, message: 'Unknown face key.' });
  }

  for (const face of FACE_ORDER) {
    const stickers = candidate[face];
    if (!Array.isArray(stickers)) {
      details.push({ path: `${path}.${face}`, message: 'Face must be an array of 9 stickers.' });
      continue;
    }

    if (stickers.length !== 9) {
      details.push({ path: `${path}.${face}`, message: 'Face must contain exactly 9 stickers.' });
      continue;
    }

    for (let i = 0; i < stickers.length; i += 1) {
      const token = stickers[i];
      if (!isStickerToken(token)) {
        details.push({
          path: `${path}.${face}[${i}]`,
          message: 'Sticker must be one of W, R, G, Y, O, B.'
        });
      }
    }
  }

  return details;
}

export function validateMoveApplyRequest(payload) {
  const details = [];
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }]
    };
  }

  const unknown = findUnknownKeys(payload, ['state', 'move']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  if (!Object.hasOwn(payload, 'state')) {
    details.push({ path: 'state', message: 'state is required.' });
  } else {
    details.push(...validateCubeState(payload.state, 'state'));
  }

  if (!Object.hasOwn(payload, 'move')) {
    details.push({ path: 'move', message: 'move is required.' });
  } else if (!isSupportedMove(payload.move)) {
    details.push({
      path: 'move',
      message: `Move must be one of ${MOVE_TOKENS.join(', ')}.`
    });
  }

  if (details.length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      state: cloneCubeState(payload.state),
      move: payload.move
    }
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
  const unknown = findUnknownKeys(body, ['length', 'seed']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  let length = 25;
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
      length,
      seed
    }
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
  const unknown = findUnknownKeys(payload, ['state', 'strategy']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  if (!Object.hasOwn(payload, 'state')) {
    details.push({ path: 'state', message: 'state is required.' });
  } else {
    details.push(...validateCubeState(payload.state, 'state'));
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
      state: cloneCubeState(payload.state),
      strategy
    }
  };
}
