import { FACE_ORDER, MOVE_TOKENS, cloneCubeState, isStickerToken, isSupportedMove, type CubeState } from './cube.js';

import type {
  AiCoachMode,
  AiHelpRequest,
  AiMoveValidationRequest,
  ApiErrorDetail,
} from './types/contracts.js';

const FACE_SET = new Set(FACE_ORDER);
const ALLOWED_STRATEGIES = new Set(['beginner', 'cfop']);
const AI_COACH_MODES = new Set<AiCoachMode>(['hint', 'guide', 'solve', 'explain']);

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

export function validateAiMoveValidationRequest(payload: unknown):
  | { ok: true; value: AiMoveValidationRequest }
  | { ok: false; details: ApiErrorDetail[] } {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  const details: ApiErrorDetail[] = [];
  const unknown = findUnknownKeys(payload, ['state', 'candidateMove', 'moveHistory', 'tutorialStepTitle', 'isTimedSolve']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  let state: CubeState | null = null;
  if (!Object.hasOwn(payload, 'state')) {
    details.push({ path: 'state', message: 'state is required.' });
  } else {
    details.push(...validateCubeState(payload.state, 'state'));
    if (details.length === 0) {
      state = cloneCubeState(payload.state as CubeState);
    }
  }

  let candidateMove: string | null = null;
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

  let moveHistory: string[] = [];
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

  let tutorialStepTitle: string | undefined;
  if (Object.hasOwn(payload, 'tutorialStepTitle')) {
    if (typeof payload.tutorialStepTitle !== 'string') {
      details.push({ path: 'tutorialStepTitle', message: 'tutorialStepTitle must be a string.' });
    } else if (payload.tutorialStepTitle.length > 120) {
      details.push({ path: 'tutorialStepTitle', message: 'tutorialStepTitle must be 120 characters or less.' });
    } else if (payload.tutorialStepTitle.trim().length > 0) {
      tutorialStepTitle = payload.tutorialStepTitle.trim();
    }
  }

  let isTimedSolve: boolean | undefined;
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

function validateStringArrayField(
  details: ApiErrorDetail[],
  parent: Record<string, unknown>,
  field: string,
  path: string,
  maxLength: number,
): string[] | null {
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

  const normalized: string[] = [];
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

export function validateAiHelpRequest(payload: unknown):
  | { ok: true; value: AiHelpRequest }
  | { ok: false; details: ApiErrorDetail[] } {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      details: [{ path: 'body', message: 'Request body must be a JSON object.' }],
    };
  }

  const details: ApiErrorDetail[] = [];
  const unknown = findUnknownKeys(payload, ['mode', 'context', 'message', 'previousCoachResponse']);
  for (const key of unknown) {
    details.push({ path: key, message: 'Unknown request field.' });
  }

  let mode: AiCoachMode | null = null;
  if (!Object.hasOwn(payload, 'mode')) {
    details.push({ path: 'mode', message: 'mode is required.' });
  } else if (typeof payload.mode !== 'string' || !AI_COACH_MODES.has(payload.mode as AiCoachMode)) {
    details.push({ path: 'mode', message: 'mode must be one of hint, guide, solve, explain.' });
  } else {
    mode = payload.mode as AiCoachMode;
  }

  if (Object.hasOwn(payload, 'message')) {
    if (typeof payload.message !== 'string') {
      details.push({ path: 'message', message: 'message must be a string.' });
    } else if (payload.message.length > 1000) {
      details.push({ path: 'message', message: 'message must be 1000 characters or less.' });
    }
  }

  let previousCoachResponse: AiHelpRequest['previousCoachResponse'] | undefined;
  if (Object.hasOwn(payload, 'previousCoachResponse')) {
    const previous = payload.previousCoachResponse;
    if (!isPlainObject(previous)) {
      details.push({ path: 'previousCoachResponse', message: 'previousCoachResponse must be an object.' });
    } else {
      const unknownPrevious = findUnknownKeys(previous, ['id', 'mode', 'content']);
      for (const key of unknownPrevious) {
        details.push({ path: `previousCoachResponse.${key}`, message: 'Unknown request field.' });
      }

      const id = previous.id;
      const previousMode = previous.mode;
      const content = previous.content;

      if (typeof id !== 'string' || id.length === 0) {
        details.push({ path: 'previousCoachResponse.id', message: 'id must be a non-empty string.' });
      }
      if (typeof previousMode !== 'string' || !AI_COACH_MODES.has(previousMode as AiCoachMode)) {
        details.push({
          path: 'previousCoachResponse.mode',
          message: 'mode must be one of hint, guide, solve, explain.',
        });
      }
      if (typeof content !== 'string' || content.length === 0) {
        details.push({ path: 'previousCoachResponse.content', message: 'content must be a non-empty string.' });
      }

      if (typeof id === 'string' && id.length > 0
        && typeof previousMode === 'string' && AI_COACH_MODES.has(previousMode as AiCoachMode)
        && typeof content === 'string' && content.length > 0) {
        previousCoachResponse = {
          id,
          mode: previousMode as AiCoachMode,
          content,
        };
      }
    }
  }

  let contextValue: AiHelpRequest['context'] | null = null;
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

    let cubeState: CubeState | null = null;
    if (!Object.hasOwn(context, 'cubeState')) {
      details.push({ path: 'context.cubeState', message: 'cubeState is required.' });
    } else {
      details.push(...validateCubeState(context.cubeState, 'context.cubeState'));
      if (details.length === 0) {
        cubeState = cloneCubeState(context.cubeState as CubeState);
      }
    }

    const moveHistory = validateStringArrayField(details, context, 'moveHistory', 'context.moveHistory', 5000);
    const scramble = validateStringArrayField(details, context, 'scramble', 'context.scramble', 400);

    const tutorialStepIndex = context.tutorialStepIndex;
    if (!Object.hasOwn(context, 'tutorialStepIndex')) {
      details.push({ path: 'context.tutorialStepIndex', message: 'tutorialStepIndex is required.' });
    } else if (typeof tutorialStepIndex !== 'number' || !Number.isInteger(tutorialStepIndex) || tutorialStepIndex < 0) {
      details.push({
        path: 'context.tutorialStepIndex',
        message: 'tutorialStepIndex must be a non-negative integer.',
      });
    }

    const tutorialStepTitle = context.tutorialStepTitle;
    if (!Object.hasOwn(context, 'tutorialStepTitle')) {
      details.push({ path: 'context.tutorialStepTitle', message: 'tutorialStepTitle is required.' });
    } else if (typeof tutorialStepTitle !== 'string' || tutorialStepTitle.length === 0) {
      details.push({ path: 'context.tutorialStepTitle', message: 'tutorialStepTitle must be a non-empty string.' });
    }

    const timerMs = context.timerMs;
    if (!Object.hasOwn(context, 'timerMs')) {
      details.push({ path: 'context.timerMs', message: 'timerMs is required.' });
    } else if (typeof timerMs !== 'number' || !Number.isInteger(timerMs) || timerMs < 0) {
      details.push({ path: 'context.timerMs', message: 'timerMs must be a non-negative integer.' });
    }

    const idleMs = context.idleMs;
    if (!Object.hasOwn(context, 'idleMs')) {
      details.push({ path: 'context.idleMs', message: 'idleMs is required.' });
    } else if (typeof idleMs !== 'number' || !Number.isInteger(idleMs) || idleMs < 0) {
      details.push({ path: 'context.idleMs', message: 'idleMs must be a non-negative integer.' });
    }

    const solveDepth = context.solveDepth;
    if (!Object.hasOwn(context, 'solveDepth')) {
      details.push({ path: 'context.solveDepth', message: 'solveDepth is required.' });
    } else if (typeof solveDepth !== 'number' || !Number.isInteger(solveDepth) || solveDepth < 0) {
      details.push({ path: 'context.solveDepth', message: 'solveDepth must be a non-negative integer.' });
    }

    const queueActive = context.queueActive;
    if (!Object.hasOwn(context, 'queueActive')) {
      details.push({ path: 'context.queueActive', message: 'queueActive is required.' });
    } else if (typeof queueActive !== 'boolean') {
      details.push({ path: 'context.queueActive', message: 'queueActive must be a boolean.' });
    }

    const isSolved = context.isSolved;
    if (!Object.hasOwn(context, 'isSolved')) {
      details.push({ path: 'context.isSolved', message: 'isSolved is required.' });
    } else if (typeof isSolved !== 'boolean') {
      details.push({ path: 'context.isSolved', message: 'isSolved must be a boolean.' });
    }

    if (
      cubeState
      && moveHistory
      && scramble
      && typeof tutorialStepIndex === 'number'
      && Number.isInteger(tutorialStepIndex)
      && tutorialStepIndex >= 0
      && typeof tutorialStepTitle === 'string'
      && tutorialStepTitle.length > 0
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
        tutorialStepIndex,
        tutorialStepTitle,
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
