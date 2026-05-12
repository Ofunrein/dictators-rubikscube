/**
 * moveNotation.ts — String utilities for Rubik's Cube move notation
 *
 * Pure functions for parsing, normalizing, inverting, and expanding move
 * tokens. Used by the queue, the undo system, and the solve pipeline to
 * manipulate move sequences without touching cube state directly.
 *
 * Key exports:
 *   - inverseMove(move) — returns the inverse of a single move token
 *   - isSliceMove(move) — true for M, E, S, r, l, u, d, f, b moves
 *   - expandMoveToken(move) — expands "X2" into ["X", "X"] for animation
 *   - normalizeMoveSequence(moves) — cancels redundant adjacent moves
 *   - mergeMoveIntoSolveStack(stack, move) — appends a move and cancels inverses
 */

export function inverseMove(move: string): string {
  if (move.endsWith('2')) return move;
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

export function isSliceMove(move: string): boolean {
  return /^[MESrludfb]'?$/.test(move?.trim?.() ?? '');
}

export function expandMoveToken(move: string | null | undefined): string[] {
  const token = move?.trim();
  if (!token) return [];
  if (/^[URFDLBMESxyzrludfb]2$/.test(token)) {
    const baseToken = token.slice(0, -1);
    return [baseToken, baseToken];
  }
  if (/^[URFDLBMESxyzrludfb]'?$/.test(token)) {
    return [token];
  }
  return [];
}

export function normalizeMoveSequence(sequence: string[]): string[] {
  return sequence.flatMap(expandMoveToken);
}

export function invertMoveSequence(sequence: string[]): string[] {
  return [...normalizeMoveSequence(sequence)].reverse().map(inverseMove);
}

export function mergeMoveIntoSolveStack(stack: string[], move: string): void {
  const inverse = inverseMove(move);
  if (stack.length > 0 && stack[stack.length - 1] === inverse) {
    stack.pop();
    return;
  }
  stack.push(move);
}
