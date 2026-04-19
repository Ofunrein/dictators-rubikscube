/**
 * moveNotation.js — String utilities for Rubik's Cube move notation
 *
 * These functions work with move STRINGS, not with 3D geometry or animation.
 * They answer questions like:
 *   - What's the opposite of "R"?  →  "R'"  (inverseMove)
 *   - Is "M" a slice move?         →  yes   (isSliceMove)
 *   - What does "R2" expand to?    →  ["R", "R"]  (expandMoveToken)
 *
 * Separated from simulatorAnimation.js because move notation is useful
 * in places that don't care about 3D rendering (like the solve stack
 * tracking and the action handlers).
 *
 * These are also re-exported from simulatorAnimation.js for backward
 * compatibility, so existing imports keep working.
 */

// Flip a move to its opposite: "R" becomes "R'" (counter-clockwise), "R'" becomes "R".
export function inverseMove(move) {
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

// Returns true for any non-outer-layer turn (M, E, S slices or 4x4 inner moves).
export function isSliceMove(move) {
  return /^[MESrludfb]'?$/.test(move?.trim?.() ?? '');
}

// Handles shorthand notation: "R2" means "do R twice" → ["R", "R"].
// Single moves like "R" or "R'" pass through unchanged.
// Returns an empty array if the token isn't recognized.
export function expandMoveToken(move) {
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

// Expands all tokens in a sequence. For example:
// ["R2", "U'", "F"] → ["R", "R", "U'", "F"]
export function normalizeMoveSequence(sequence) {
  return sequence.flatMap(expandMoveToken);
}

// Reverse an entire move sequence and invert each move.
// For example: ["R", "U'", "F"] → ["F'", "U", "R'"]
// Used by the solve logic to undo every move the user made, in reverse order.
export function invertMoveSequence(sequence) {
  return [...normalizeMoveSequence(sequence)].reverse().map(inverseMove);
}

// Keeps a running log of user moves for the Solve button.
// If the last move on the stack is the inverse of the new move, they cancel out
// (like doing R then R' = nothing happened), so we pop instead of push.
// This keeps the solve stack as short as possible.
export function mergeMoveIntoSolveStack(stack, move) {
  const inverse = inverseMove(move);
  if (stack.length > 0 && stack[stack.length - 1] === inverse) {
    stack.pop();
    return;
  }
  stack.push(move);
}
