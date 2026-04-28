import { FACE_ORDER, isSupportedMove, applyMoveToState, type CubeState } from '../cube.js';
import type { AiMoveValidationRequest, AiMoveValidationResult } from '../types/contracts.js';

function inverseMove(move: string): string {
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

function moveFace(move: string): string {
  return move.replace("'", '');
}

function normalizeHistory(moveHistory: string[] = []): string[] {
  return moveHistory
    .map((move) => move.trim())
    .filter((move) => move.length > 0 && isSupportedMove(move));
}

function mismatchScore(state: CubeState): number {
  let score = 0;
  for (const face of FACE_ORDER) {
    const center = state[face][4];
    for (const sticker of state[face]) {
      if (sticker !== center) {
        score += 1;
      }
    }
  }
  return score;
}

function detectLoop(history: string[], candidateMove: string): boolean {
  if (history.length < 6) {
    return false;
  }

  const previousTriplet = history.slice(-6, -3);
  const currentTriplet = history.slice(-3);
  const tripletMatches = currentTriplet.every((move, idx) => move === previousTriplet[idx]);
  return tripletMatches && candidateMove === currentTriplet[0];
}

function buildAlternativeMoves(candidateMove: string): string[] {
  const blockedFace = moveFace(candidateMove);
  const alternatives = ['U', 'R', 'F', 'L', 'D', 'B']
    .filter((move) => moveFace(move) !== blockedFace)
    .filter((move) => isSupportedMove(move));
  return alternatives.slice(0, 3);
}

export function analyzeMoveValidation(payload: AiMoveValidationRequest): AiMoveValidationResult {
  const candidateMove = payload.candidateMove.trim();
  if (!isSupportedMove(candidateMove)) {
    return {
      move: candidateMove,
      isLegal: false,
      status: 'correction',
      reason: 'This move token is not legal for the current cube controls.',
      shouldBlock: true,
      alternativeMoves: buildAlternativeMoves(candidateMove),
    };
  }

  const history = normalizeHistory(payload.moveHistory);
  const previousScore = mismatchScore(payload.state);
  const nextState = applyMoveToState(payload.state, candidateMove);
  const nextScore = mismatchScore(nextState);
  const scoreDelta = nextScore - previousScore;

  const lastMove = history.length > 0 ? history[history.length - 1] : null;
  const isUndo = lastMove ? inverseMove(lastMove) === candidateMove : false;
  const loopsBack = detectLoop(history, candidateMove);
  const sameFaceCount = [...history.slice(-5), candidateMove]
    .map(moveFace)
    .filter((face) => face === moveFace(candidateMove))
    .length;
  const faceOveruse = sameFaceCount >= 4;

  let status: AiMoveValidationResult['status'] = 'approved';
  let reason = payload.tutorialStepTitle
    ? `Legal move for ${payload.tutorialStepTitle}.`
    : 'Legal move.';
  let shouldBlock = false;
  let alternativeMoves: string[] | undefined;

  if (loopsBack) {
    status = 'correction';
    shouldBlock = true;
    reason = 'This repeats a recent loop and is likely to stall progress.';
    alternativeMoves = buildAlternativeMoves(candidateMove);
  } else if (isUndo && payload.isTimedSolve) {
    status = 'correction';
    shouldBlock = true;
    reason = 'This immediately undoes your last move during a timed solve.';
    alternativeMoves = buildAlternativeMoves(candidateMove);
  } else if (isUndo) {
    status = 'warning';
    reason = 'This undoes your last move. Continue only if you are intentionally backtracking.';
  } else if (faceOveruse) {
    status = 'warning';
    reason = `You are heavily repeating ${moveFace(candidateMove)} turns. Consider a setup move on another face.`;
  } else if (scoreDelta > 4) {
    status = 'warning';
    reason = 'This move appears to reduce overall cube alignment. Re-check your target pair first.';
  } else if (scoreDelta < -2) {
    status = 'approved';
    reason = 'This move appears to improve alignment toward solved state.';
  }

  return {
    move: candidateMove,
    isLegal: true,
    status,
    reason,
    shouldBlock,
    ...(alternativeMoves && alternativeMoves.length > 0 ? { alternativeMoves } : {}),
    scoreBefore: previousScore,
    scoreAfter: nextScore,
    scoreDelta,
  };
}
