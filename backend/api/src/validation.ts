import { FACE_ORDER, MOVE_TOKENS, cloneCubeState, isStickerToken, isSupportedMove, type CubeState } from './cube.js';

import type { ApiErrorDetail } from './types/contracts.js';

const FACE_SET = new Set(FACE_ORDER);
const ALLOWED_STRATEGIES = new Set(['beginner', 'cfop']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function findUnknownKeys(value: Record<string, unknown>, allowedKeys: string[]): string[] {
  return Object.keys(value).filter((key) => !allowedKeys.includes(key));
}

export function validateCubeState(candidate: unknown, path = 'state'): ApiErrorDetail[] {
  const details: ApiErrorDetail[] = [];

  if (!isPlainObject(candidate)) {
    details.push({
      path,
      message: 'Cube state must be an object with U, R, F, D, L, B faces.',
    });
    return details;
  }

  const unknownFaces = Object.keys(candidate).filter((key) => !FACE_SET.has(key as (typeof FACE_ORDER)[number]));
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

    for (let index = 0; index < stickers.length; index += 1) {
      const token = stickers[index];
      if (!isStickerToken(token)) {
        details.push({
          path: `${path}.${face}[${index}]`,
          message: 'Sticker must be one of W, R, G, Y, O, B.',
        });
      }
    }
  }

  return details;
}

export function validateMoveApplyRequest(payload: unknown):
  | { ok: true; value: { state: CubeState; move: string } }
  | { ok: false; details: ApiErrorDetail[] } {
  const details: ApiErrorDetail[] = [];
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }],
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
  } else if (typeof payload.move !== 'string' || !isSupportedMove(payload.move)) {
    details.push({
      path: 'move',
      message: `Move must be one of ${MOVE_TOKENS.join(', ')}.`,
    });
  }

  if (details.length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      state: cloneCubeState(payload.state as CubeState),
      move: payload.move as string,
    },
  };
}

export function validateScrambleRequest(payload: unknown):
  | { ok: true; value: { length: number; seed?: number } }
  | { ok: false; details: ApiErrorDetail[] } {
  const body = payload ?? {};
  if (!isPlainObject(body)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  const details: ApiErrorDetail[] = [];
  const unknown = findUnknownKeys(body, ['length', 'seed']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  let length = 25;
  if (Object.hasOwn(body, 'length')) {
    const requestedLength = body.length;
    if (typeof requestedLength !== 'number' || !Number.isInteger(requestedLength)) {
      details.push({ path: 'length', message: 'length must be an integer.' });
    } else if (requestedLength < 1 || requestedLength > 100) {
      details.push({ path: 'length', message: 'length must be between 1 and 100.' });
    } else {
      length = requestedLength;
    }
  }

  let seed: number | undefined;
  if (Object.hasOwn(body, 'seed')) {
    const requestedSeed = body.seed;
    if (typeof requestedSeed !== 'number' || !Number.isInteger(requestedSeed)) {
      details.push({ path: 'seed', message: 'seed must be an integer.' });
    } else if (requestedSeed < 0 || requestedSeed > 2147483647) {
      details.push({ path: 'seed', message: 'seed must be between 0 and 2147483647.' });
    } else {
      seed = requestedSeed;
    }
  }

  if (details.length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      length,
      seed,
    },
  };
}

export function validateSolveRequest(payload: unknown):
  | { ok: true; value: { state: CubeState; strategy: string } }
  | { ok: false; details: ApiErrorDetail[] } {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  const details: ApiErrorDetail[] = [];
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
      state: cloneCubeState(payload.state as CubeState),
      strategy,
    },
  };
}
