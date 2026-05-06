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
const AI_COACH_MODES = new Set(['hint', 'guide', 'solve', 'explain']);

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

export function validateAiMoveValidationRequest(payload) {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  const details = [];
  const unknown = findUnknownKeys(payload, ['state', 'candidateMove', 'moveHistory', 'tutorialStepTitle', 'isTimedSolve']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  let state = null;
  if (!Object.hasOwn(payload, 'state')) {
    details.push({ path: 'state', message: 'state is required.' });
  } else {
    details.push(...validateCubeState(payload.state, undefined, 'state'));
    if (details.length === 0) {
      state = cloneCubeState(payload.state);
    }
  }

  let candidateMove = null;
  if (!Object.hasOwn(payload, 'candidateMove')) {
    details.push({ path: 'candidateMove', message: 'candidateMove is required.' });
  } else if (typeof payload.candidateMove !== 'string' || payload.candidateMove.trim().length === 0) {
    details.push({
      path: 'candidateMove',
      message: 'candidateMove must be a non-empty string.',
    });
  } else {
    candidateMove = payload.candidateMove.trim();
  }

  const moveHistory = [];
  if (Object.hasOwn(payload, 'moveHistory')) {
    if (!Array.isArray(payload.moveHistory)) {
      details.push({ path: 'moveHistory', message: 'moveHistory must be an array of strings.' });
    } else if (payload.moveHistory.length > 5000) {
      details.push({ path: 'moveHistory', message: 'moveHistory must contain at most 5000 items.' });
    } else {
      for (let index = 0; index < payload.moveHistory.length; index += 1) {
        const item = payload.moveHistory[index];
        if (typeof item !== 'string') {
          details.push({ path: `moveHistory[${index}]`, message: 'Value must be a string.' });
          continue;
        }
        moveHistory.push(item);
      }
    }
  }

  let tutorialStepTitle;
  if (Object.hasOwn(payload, 'tutorialStepTitle')) {
    if (typeof payload.tutorialStepTitle !== 'string') {
      details.push({ path: 'tutorialStepTitle', message: 'tutorialStepTitle must be a string.' });
    } else if (payload.tutorialStepTitle.length > 120) {
      details.push({ path: 'tutorialStepTitle', message: 'tutorialStepTitle must be 120 characters or less.' });
    } else if (payload.tutorialStepTitle.trim().length > 0) {
      tutorialStepTitle = payload.tutorialStepTitle.trim();
    }
  }

  let isTimedSolve;
  if (Object.hasOwn(payload, 'isTimedSolve')) {
    if (typeof payload.isTimedSolve !== 'boolean') {
      details.push({ path: 'isTimedSolve', message: 'isTimedSolve must be a boolean.' });
    } else {
      isTimedSolve = payload.isTimedSolve;
    }
  }

  if (details.length > 0 || !state || !candidateMove) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      state,
      candidateMove,
      moveHistory,
      ...(tutorialStepTitle ? { tutorialStepTitle } : {}),
      ...(typeof isTimedSolve === 'boolean' ? { isTimedSolve } : {}),
    },
  };
}

function validateStringArrayField(details, parent, field, path, maxLength) {
  if (!Object.hasOwn(parent, field)) {
    details.push({ path, message: `${field} is required.` });
    return null;
  }

  const value = parent[field];
  if (!Array.isArray(value)) {
    details.push({ path, message: `${field} must be an array of strings.` });
    return null;
  }

  if (value.length > maxLength) {
    details.push({ path, message: `${field} must contain at most ${maxLength} items.` });
  }

  const normalized = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    if (typeof item !== 'string') {
      details.push({ path: `${path}[${index}]`, message: 'Value must be a string.' });
      continue;
    }
    normalized.push(item);
  }

  return normalized;
}

export function validateAiHelpRequest(payload) {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  const details = [];
  const unknown = findUnknownKeys(payload, ['mode', 'context', 'message', 'previousCoachResponse']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  let mode = null;
  if (!Object.hasOwn(payload, 'mode')) {
    details.push({ path: 'mode', message: 'mode is required.' });
  } else if (typeof payload.mode !== 'string' || !AI_COACH_MODES.has(payload.mode)) {
    details.push({ path: 'mode', message: 'mode must be one of hint, guide, solve, explain.' });
  } else {
    mode = payload.mode;
  }

  if (Object.hasOwn(payload, 'message')) {
    if (typeof payload.message !== 'string') {
      details.push({ path: 'message', message: 'message must be a string.' });
    } else if (payload.message.length > 1000) {
      details.push({ path: 'message', message: 'message must be 1000 characters or less.' });
    }
  }

  let previousCoachResponse;
  if (Object.hasOwn(payload, 'previousCoachResponse')) {
    const previous = payload.previousCoachResponse;
    if (!isPlainObject(previous)) {
      details.push({ path: 'previousCoachResponse', message: 'previousCoachResponse must be an object.' });
    } else {
      const unknownPrevious = findUnknownKeys(previous, ['id', 'mode', 'content']);
      for (const key of unknownPrevious) {
        details.push({ path: `previousCoachResponse.${key}`, message: 'Unknown request field.' });
      }

      const { id, mode: previousMode, content } = previous;
      if (typeof id !== 'string' || id.length === 0) {
        details.push({ path: 'previousCoachResponse.id', message: 'id must be a non-empty string.' });
      }
      if (typeof previousMode !== 'string' || !AI_COACH_MODES.has(previousMode)) {
        details.push({
          path: 'previousCoachResponse.mode',
          message: 'mode must be one of hint, guide, solve, explain.',
        });
      }
      if (typeof content !== 'string' || content.length === 0) {
        details.push({ path: 'previousCoachResponse.content', message: 'content must be a non-empty string.' });
      }

      if (typeof id === 'string' && id.length > 0
        && typeof previousMode === 'string' && AI_COACH_MODES.has(previousMode)
        && typeof content === 'string' && content.length > 0) {
        previousCoachResponse = { id, mode: previousMode, content };
      }
    }
  }

  let contextValue = null;
  if (!Object.hasOwn(payload, 'context')) {
    details.push({ path: 'context', message: 'context is required.' });
  } else if (!isPlainObject(payload.context)) {
    details.push({ path: 'context', message: 'context must be an object.' });
  } else {
    const context = payload.context;
    const unknownContext = findUnknownKeys(context, [
      'cubeState',
      'moveHistory',
      'scramble',
      'tutorialStepIndex',
      'tutorialStepTitle',
      'timerMs',
      'idleMs',
      'solveDepth',
      'queueActive',
      'isSolved',
    ]);
    for (const key of unknownContext) {
      details.push({ path: `context.${key}`, message: 'Unknown request field.' });
    }

    let cubeState = null;
    if (!Object.hasOwn(context, 'cubeState')) {
      details.push({ path: 'context.cubeState', message: 'cubeState is required.' });
    } else {
      details.push(...validateCubeState(context.cubeState, undefined, 'context.cubeState'));
      if (details.length === 0) {
        cubeState = cloneCubeState(context.cubeState);
      }
    }

    const moveHistory = validateStringArrayField(details, context, 'moveHistory', 'context.moveHistory', 5000);
    const scramble = validateStringArrayField(details, context, 'scramble', 'context.scramble', 400);

    let tutorialStepIndex;
    if (Object.hasOwn(context, 'tutorialStepIndex')) {
      if (typeof context.tutorialStepIndex !== 'number'
        || !Number.isInteger(context.tutorialStepIndex)
        || context.tutorialStepIndex < 0) {
        details.push({
          path: 'context.tutorialStepIndex',
          message: 'tutorialStepIndex must be a non-negative integer.',
        });
      } else {
        tutorialStepIndex = context.tutorialStepIndex;
      }
    }

    let tutorialStepTitle;
    if (Object.hasOwn(context, 'tutorialStepTitle')) {
      if (typeof context.tutorialStepTitle !== 'string') {
        details.push({ path: 'context.tutorialStepTitle', message: 'tutorialStepTitle must be a string.' });
      } else if (context.tutorialStepTitle.length > 120) {
        details.push({ path: 'context.tutorialStepTitle', message: 'tutorialStepTitle must be 120 characters or less.' });
      } else if (context.tutorialStepTitle.trim().length > 0) {
        tutorialStepTitle = context.tutorialStepTitle.trim();
      }
    }

    const { timerMs, idleMs, solveDepth, queueActive, isSolved } = context;
    if (!Object.hasOwn(context, 'timerMs')) {
      details.push({ path: 'context.timerMs', message: 'timerMs is required.' });
    } else if (typeof timerMs !== 'number' || !Number.isInteger(timerMs) || timerMs < 0) {
      details.push({ path: 'context.timerMs', message: 'timerMs must be a non-negative integer.' });
    }

    if (!Object.hasOwn(context, 'idleMs')) {
      details.push({ path: 'context.idleMs', message: 'idleMs is required.' });
    } else if (typeof idleMs !== 'number' || !Number.isInteger(idleMs) || idleMs < 0) {
      details.push({ path: 'context.idleMs', message: 'idleMs must be a non-negative integer.' });
    }

    if (!Object.hasOwn(context, 'solveDepth')) {
      details.push({ path: 'context.solveDepth', message: 'solveDepth is required.' });
    } else if (typeof solveDepth !== 'number' || !Number.isInteger(solveDepth) || solveDepth < 0) {
      details.push({ path: 'context.solveDepth', message: 'solveDepth must be a non-negative integer.' });
    }

    if (!Object.hasOwn(context, 'queueActive')) {
      details.push({ path: 'context.queueActive', message: 'queueActive is required.' });
    } else if (typeof queueActive !== 'boolean') {
      details.push({ path: 'context.queueActive', message: 'queueActive must be a boolean.' });
    }

    if (!Object.hasOwn(context, 'isSolved')) {
      details.push({ path: 'context.isSolved', message: 'isSolved is required.' });
    } else if (typeof isSolved !== 'boolean') {
      details.push({ path: 'context.isSolved', message: 'isSolved must be a boolean.' });
    }

    if (
      cubeState
      && moveHistory
      && scramble
      && typeof timerMs === 'number'
      && Number.isInteger(timerMs)
      && timerMs >= 0
      && typeof idleMs === 'number'
      && Number.isInteger(idleMs)
      && idleMs >= 0
      && typeof solveDepth === 'number'
      && Number.isInteger(solveDepth)
      && solveDepth >= 0
      && typeof queueActive === 'boolean'
      && typeof isSolved === 'boolean'
    ) {
      contextValue = {
        cubeState,
        moveHistory: [...moveHistory],
        scramble: [...scramble],
        ...(typeof tutorialStepIndex === 'number' ? { tutorialStepIndex } : {}),
        ...(tutorialStepTitle ? { tutorialStepTitle } : {}),
        timerMs,
        idleMs,
        solveDepth,
        queueActive,
        isSolved,
      };
    }
  }

  if (details.length > 0 || !mode || !contextValue) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      mode,
      context: contextValue,
      ...(typeof payload.message === 'string' ? { message: payload.message } : {}),
      ...(previousCoachResponse ? { previousCoachResponse } : {}),
    },
  };
}
