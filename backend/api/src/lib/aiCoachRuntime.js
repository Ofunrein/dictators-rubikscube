import { FACE_ORDER, applyMoveToState, getFaceSize, isSupportedMove, normalizeCubeSize } from '../cube.js';
import { isSolvedState } from '../solvers/solvePipeline.js';

const AI_MODES = new Set(['hint', 'guide', 'solve', 'explain']);

function cloneState(state) {
  return Object.fromEntries(FACE_ORDER.map((face) => [face, [...state[face]]]));
}

function inverseMove(move) {
  if (move.endsWith('2')) return move;
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

function normalizeMove(move, size = 3) {
  if (typeof move !== 'string') return null;
  const token = move.trim();
  return isSupportedMove(token, size) ? token : null;
}

function buildSolveSuggestion(moveHistory = [], size = 3) {
  // Reversing the history plays moves in the opposite order they were made,
  // and inverting each one undoes it — together they retrace the scramble backwards.
  return moveHistory
    .map((move) => normalizeMove(move, size))
    .filter(Boolean)
    .reverse()
    .map(inverseMove);
}

function mismatchScore(state) {
  let score = 0;
  for (const face of FACE_ORDER) {
    const stickers = state[face];
    // On any NxN cube the center sticker is always the middle index; floor handles both odd and even face arrays.
    const center = stickers[Math.floor(stickers.length / 2)];
    // Each sticker that disagrees with its face's center is "out of place" — more mismatches = deeper scramble.
    for (const sticker of stickers) {
      if (sticker !== center) score += 1;
    }
  }
  return score;
}

function detectRepeatedLoop(history, candidateMove) {
  if (history.length < 6) return false;
  // A 6-move window lets us compare two consecutive triplets; shorter windows miss multi-move loops.
  const previousTriplet = history.slice(-6, -3);
  const currentTriplet = history.slice(-3);
  // If the last two triplets are identical and the next move would restart the pattern, the solver is cycling.
  return currentTriplet.every((move, index) => move === previousTriplet[index])
    && candidateMove === currentTriplet[0];
}

function moveFace(move) {
  return move.replace(/['2]/g, '');
}

function alternativeMoves(candidateMove, size) {
  const blockedFace = moveFace(candidateMove).toUpperCase();
  // Suggesting moves on the same face as the rejected move would be equally wrong or redundant.
  return ['U', 'R', 'F', 'L', 'D', 'B']
    .filter((move) => moveFace(move) !== blockedFace)
    .filter((move) => isSupportedMove(move, size))
    .slice(0, 3);
}

export function validateAiHelpRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, details: [{ path: 'body', message: 'Request body must be a JSON object.' }] };
  }

  const details = [];
  if (!AI_MODES.has(payload.mode)) {
    details.push({ path: 'mode', message: 'mode must be one of hint, guide, solve, explain.' });
  }

  const context = payload.context;
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    details.push({ path: 'context', message: 'context is required.' });
  } else {
    if (!context.cubeState || typeof context.cubeState !== 'object') {
      details.push({ path: 'context.cubeState', message: 'cubeState is required.' });
    }
    if (!Array.isArray(context.moveHistory)) {
      details.push({ path: 'context.moveHistory', message: 'moveHistory must be an array.' });
    }
    if (!Array.isArray(context.scramble)) {
      details.push({ path: 'context.scramble', message: 'scramble must be an array.' });
    }
  }

  if (details.length > 0) return { ok: false, details };

  return {
    ok: true,
    value: {
      mode: payload.mode,
      message: typeof payload.message === 'string' ? payload.message.slice(0, 1000) : '',
      previousCoachResponse: payload.previousCoachResponse,
      context: {
        ...context,
        cubeState: cloneState(context.cubeState),
        moveHistory: context.moveHistory.map(String).slice(-5000),
        scramble: context.scramble.map(String).slice(-400),
      },
    },
  };
}

export function validateAiMoveValidationRequest(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, details: [{ path: 'body', message: 'Request body must be a JSON object.' }] };
  }

  const details = [];
  if (!payload.state || typeof payload.state !== 'object') {
    details.push({ path: 'state', message: 'state is required.' });
  }
  if (typeof payload.candidateMove !== 'string' || payload.candidateMove.trim().length === 0) {
    details.push({ path: 'candidateMove', message: 'candidateMove must be a non-empty string.' });
  }
  if (payload.moveHistory !== undefined && !Array.isArray(payload.moveHistory)) {
    details.push({ path: 'moveHistory', message: 'moveHistory must be an array.' });
  }

  if (details.length > 0) return { ok: false, details };

  return {
    ok: true,
    value: {
      state: cloneState(payload.state),
      candidateMove: payload.candidateMove.trim(),
      moveHistory: Array.isArray(payload.moveHistory) ? payload.moveHistory.map(String) : [],
      isTimedSolve: payload.isTimedSolve === true,
    },
  };
}

export async function generateAiCoachResult(payload) {
  const size = normalizeCubeSize(getFaceSize(payload.context.cubeState) ?? 3);
  const moveHistory = payload.context.moveHistory ?? [];
  const question = payload.message?.trim();
  const solved = payload.context.isSolved === true || isSolvedState(payload.context.cubeState);

  let coachMessage;
  if (solved) {
    coachMessage = {
      id: `coach_${payload.mode}_solved`,
      content: 'Nice work, the cube is already solved. Scramble again to start a new coaching round.',
      nextActions: ['Start a new scramble', 'Run the timer', 'Ask for a hint when stuck'],
    };
  } else if (payload.mode === 'solve') {
    const moves = buildSolveSuggestion(moveHistory, size);
    coachMessage = {
      id: 'coach_solve_v1',
      content: moves.length > 0
        ? 'Solve sequence generated by reversing the full verified session history.'
        : 'No move history is available to reconstruct a solve sequence.',
      moves,
      nextActions: ['Apply every move in order', 'Pause only if the cube orientation changes unexpectedly'],
      disclaimer: 'Uses deterministic fallback coaching when no external provider is configured.',
    };
  } else if (payload.mode === 'explain') {
    coachMessage = {
      id: 'coach_explain_v1',
      content: `Why this works: ${payload.previousCoachResponse?.content ?? 'each setup move should preserve solved pieces while targeting one pair.'}`,
      nextActions: ['Identify the invariant', 'Check center alignment', 'Retry one trigger slowly'],
    };
  } else {
    coachMessage = {
      id: `coach_${payload.mode}_v1`,
      content: question
        ? `Focus on "${question}" by solving one target pair at a time and checking center alignment before repeating algorithms.`
        : 'Focus on one target pair at a time, align it with matching centers, and pause before chaining another algorithm.',
      nextActions: ['Choose one target pair', 'Set it up with U turns', 'Apply one trigger slowly'],
    };
  }

  return {
    coachMessage,
    meta: {
      provider: process.env.AI_PROVIDER ?? 'mock',
      model: process.env.AI_MODEL ?? 'mock-cube-coach-v1',
      isMock: true,
      generatedAt: new Date().toISOString(),
    },
  };
}

export function analyzeMoveValidation(payload) {
  const size = normalizeCubeSize(getFaceSize(payload.state) ?? 3);
  const candidateMove = payload.candidateMove.trim();
  if (!isSupportedMove(candidateMove, size)) {
    return {
      move: candidateMove,
      isLegal: false,
      status: 'correction',
      reason: 'This move token is not legal for the current cube controls.',
      shouldBlock: true,
      alternativeMoves: alternativeMoves(candidateMove, size),
    };
  }

  const history = payload.moveHistory.map((move) => normalizeMove(move, size)).filter(Boolean);
  const previousScore = mismatchScore(payload.state);
  const nextState = applyMoveToState(payload.state, candidateMove);
  const nextScore = mismatchScore(nextState);
  const scoreDelta = nextScore - previousScore;
  const lastMove = history.at(-1);
  const isUndo = lastMove ? inverseMove(lastMove) === candidateMove : false;
  const loopsBack = detectRepeatedLoop(history, candidateMove);
  const sameFaceCount = [...history.slice(-5), candidateMove]
    .map(moveFace)
    .filter((face) => face === moveFace(candidateMove))
    .length;

  let status = 'approved';
  let reason = 'Legal move for the current cube position.';
  let shouldBlock = false;
  let alternatives;

  // A loop or an undo during a timed solve are hard-blocked: loops waste moves, and undos during
  // timed solves invalidate the attempt — but outside timed mode an undo is just a softer warning.
  if (loopsBack || (isUndo && payload.isTimedSolve)) {
    status = 'correction';
    shouldBlock = true;
    reason = loopsBack
      ? 'This repeats a recent loop and is likely to stall progress.'
      : 'This immediately undoes your last move during a timed solve.';
    alternatives = alternativeMoves(candidateMove, size);
  } else if (isUndo) {
    status = 'warning';
    reason = 'This undoes your last move. Continue only if you are intentionally backtracking.';
  } else if (sameFaceCount >= 4) {
    // Four or more turns on the same face in a 6-move window almost always means the solver is stuck
    // cycling instead of making real progress on a different layer.
    status = 'warning';
    reason = `You are heavily repeating ${moveFace(candidateMove)} turns. Consider a setup move on another face.`;
  } else if (scoreDelta > 4) {
    // A delta above 4 means at least 5 additional stickers moved away from their center color,
    // which is a strong signal the move is going in the wrong direction.
    status = 'warning';
    reason = 'This move appears to reduce overall cube alignment. Re-check your target pair first.';
  } else if (scoreDelta < -2) {
    reason = 'This move appears to improve alignment toward solved state.';
  }

  return {
    move: candidateMove,
    isLegal: true,
    status,
    reason,
    shouldBlock,
    ...(alternatives ? { alternativeMoves: alternatives } : {}),
    scoreBefore: previousScore,
    scoreAfter: nextScore,
    scoreDelta,
  };
}
