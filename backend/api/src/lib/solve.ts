/**
 * solve.ts — History-based solve derivation utilities
 *
 * When a user has been moving the cube manually, we can reconstruct the solve
 * sequence by reversing their move history — no external solver needed. This is
 * the "undo everything" approach and only works if the full history is available.
 *
 * Key exports:
 *   - isSolvedState(state) — returns true when every face is a single color
 *   - deriveSolveMovesFromHistory(moveHistory) — inverts and simplifies the history
 *     to produce the shortest replay that would undo all recorded moves
 *   - solveStateFromHistory(state, moveHistory) — combines the two above; returns
 *     the move list only if replaying it actually produces a solved state
 *
 * Does NOT call the WASM solver — see solvePipeline.js and wasmSolver.js for that.
 */
import { applyMoves, FACE_ORDER, isSupportedMove, type CubeState } from '../cube.js';

function inverseMove(move: string): string {
  if (move.endsWith('2')) {
    return move;
  }
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

function normalizeMoveToken(value: string): string | null {
  const token = value.trim();
  if (!isSupportedMove(token)) {
    return null;
  }
  return token;
}

function areInverseMoves(previous: string, current: string): boolean {
  return inverseMove(previous) === current;
}

function simplifyMoves(moves: string[]): string[] {
  const stack: string[] = [];
  for (const move of moves) {
    const top = stack[stack.length - 1];
    if (top && areInverseMoves(top, move)) {
      stack.pop();
      continue;
    }
    stack.push(move);
  }
  return stack;
}

export function isSolvedState(state: CubeState): boolean {
  return FACE_ORDER.every((face) => state[face].every((sticker) => sticker === state[face][0]));
}

export function deriveSolveMovesFromHistory(moveHistory: string[]): string[] {
  const normalized = moveHistory
    .map((move) => normalizeMoveToken(move))
    .filter((move): move is string => Boolean(move));

  const inverseSequence = normalized
    .reverse()
    .map((move) => inverseMove(move));

  return simplifyMoves(inverseSequence);
}

export function solveStateFromHistory(state: CubeState, moveHistory: string[]): string[] | null {
  const moves = deriveSolveMovesFromHistory(moveHistory);
  const nextState = applyMoves(state, moves);
  return isSolvedState(nextState) ? moves : null;
}
