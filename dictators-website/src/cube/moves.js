/**
 * moves.js — The core move engine for the Rubik's Cube
 *
 * This file defines exactly what happens to every sticker when you turn a face.
 * A Rubik's Cube state is an object with 6 faces (U, R, F, D, L, B), each
 * holding a flat array of 9 sticker color tokens.
 *
 * Face layout (flat array indices):
 *   [0][1][2]     ← top row
 *   [3][4][5]     ← middle row (index 4 is the center — never moves)
 *   [6][7][8]     ← bottom row
 *
 * Supported moves:
 *   Face turns:  U, D, L, R, F, B (and their primes U', D', etc.)
 *   Slice moves: M (middle column), E (middle row), S (middle depth)
 *   Cube rotations: x, y, z (rotate the entire cube)
 *
 * Each move function:
 *   1. Deep-copies the state (so we never mutate the original)
 *   2. Rotates the face matrix (the 9 stickers on the turning face)
 *   3. Cycles the edge stickers between adjacent faces
 *
 * This file is imported by BOTH the frontend and the backend API (via cube.js)
 * so that both always agree on what a move does.
 */

/**
 * Supported move tokens for a basic 3x3 cube.
 */
export const MOVES = ['U', 'D', 'L', 'R', 'F', 'B', "U'", "D'", "L'", "R'", "F'", "B'", 'M', "M'", 'E', "E'", 'S', "S'", 'x', "x'", 'y', "y'", 'z', "z'"];

// Helper function to rotate a face clockwise (used for basic moves)
function rotateFaceClockwise(face) {
  return [
    face[6], face[3], face[0],
    face[7], face[4], face[1],
    face[8], face[5], face[2]
  ];
}

// Helper function to rotate a face counterclockwise (used for inverse moves)
function rotateFaceCounterClockwise(face) {
  return [
    face[2], face[5], face[8],
    face[1], face[4], face[7],
    face[0], face[3], face[6]
  ];
}

function applyMoveSequence(cubeState, moves) {
  return moves.reduce((state, token) => applyMove(state, token), cubeState);
}

/**
 * Apply a move to a cube state.
 * 
 * @param {object} cubeState
 * @param {string} move
 * @returns {object}
 */
export function applyMove(cubeState, move) {
  const newState = JSON.parse(JSON.stringify(cubeState)); // Deep copy for immutability

  // Clockwise upper face rotation (U)
  if (move === 'U') {
    newState.U = rotateFaceCounterClockwise(newState.U);
    const temp = [newState.F[0], newState.F[1], newState.F[2]];
    [newState.F[0], newState.F[1], newState.F[2]] = [newState.R[0], newState.R[1], newState.R[2]];
    [newState.R[0], newState.R[1], newState.R[2]] = [newState.B[0], newState.B[1], newState.B[2]];
    [newState.B[0], newState.B[1], newState.B[2]] = [newState.L[0], newState.L[1], newState.L[2]];
    [newState.L[0], newState.L[1], newState.L[2]] = temp;
  }
  // Counterclockwise upper face rotation (U')
  if (move === "U'") {
    newState.U = rotateFaceClockwise(newState.U);
    const temp = [newState.F[0], newState.F[1], newState.F[2]];
    [newState.F[0], newState.F[1], newState.F[2]] = [newState.L[0], newState.L[1], newState.L[2]];
    [newState.L[0], newState.L[1], newState.L[2]] = [newState.B[0], newState.B[1], newState.B[2]];
    [newState.B[0], newState.B[1], newState.B[2]] = [newState.R[0], newState.R[1], newState.R[2]];
    [newState.R[0], newState.R[1], newState.R[2]] = temp;
  }

  // Clockwise right face rotation (R)
  if (move === 'R') {
    newState.R = rotateFaceClockwise(newState.R);
    const temp = [newState.F[8], newState.F[5], newState.F[2]];
    [newState.F[8], newState.F[5], newState.F[2]] = [newState.D[2], newState.D[5], newState.D[8]];
    [newState.D[2], newState.D[5], newState.D[8]] = [newState.B[0], newState.B[3], newState.B[6]];
    [newState.B[0], newState.B[3], newState.B[6]] = [newState.U[2], newState.U[5], newState.U[8]];
    [newState.U[2], newState.U[5], newState.U[8]] = temp;
  }
  // Counterclockwise right face rotation (R')
  if (move === "R'") {
    newState.R = rotateFaceCounterClockwise(newState.R);
    const temp = [newState.F[8], newState.F[5], newState.F[2]];
    [newState.F[8], newState.F[5], newState.F[2]] = [newState.U[2], newState.U[5], newState.U[8]];
    [newState.U[2], newState.U[5], newState.U[8]] = [newState.B[0], newState.B[3], newState.B[6]];
    [newState.B[0], newState.B[3], newState.B[6]] = [newState.D[2], newState.D[5], newState.D[8]];
    [newState.D[2], newState.D[5], newState.D[8]] = temp;
  }

  //Clockwise left face rotation (L)
  if (move === 'L') {
    newState.L = rotateFaceClockwise(newState.L);
    const temp = [newState.F[0], newState.F[3], newState.F[6]];
    [newState.F[0], newState.F[3], newState.F[6]] = [newState.U[6], newState.U[3], newState.U[0]];
    [newState.U[6], newState.U[3], newState.U[0]] = [newState.B[8], newState.B[5], newState.B[2]];
    [newState.B[8], newState.B[5], newState.B[2]] = [newState.D[6], newState.D[3], newState.D[0]];
    [newState.D[6], newState.D[3], newState.D[0]] = temp;
  }
  //Counterclockwise left face rotation (L')
  if (move === "L'") {
    newState.L = rotateFaceCounterClockwise(newState.L);
    const temp = [newState.F[0], newState.F[3], newState.F[6]];
    [newState.F[0], newState.F[3], newState.F[6]] = [newState.D[6], newState.D[3], newState.D[0]];
    [newState.D[6], newState.D[3], newState.D[0]] = [newState.B[8], newState.B[5], newState.B[2]];
    [newState.B[8], newState.B[5], newState.B[2]] = [newState.U[6], newState.U[3], newState.U[0]];
    [newState.U[6], newState.U[3], newState.U[0]] = temp;
  }

  //Clockwise front face rotation (F)
  if (move === 'F') {
    newState.F = rotateFaceClockwise(newState.F);
    const temp = [newState.U[0], newState.U[1], newState.U[2]];
    [newState.U[0], newState.U[1], newState.U[2]] = [newState.L[8], newState.L[5], newState.L[2]];
    [newState.L[8], newState.L[5], newState.L[2]] = [newState.D[8], newState.D[7], newState.D[6]];
    [newState.D[8], newState.D[7], newState.D[6]] = [newState.R[0], newState.R[3], newState.R[6]];
    [newState.R[0], newState.R[3], newState.R[6]] = temp;
  }
  //Counterclockwise front face rotation (F')
  if (move === "F'") {
    newState.F = rotateFaceCounterClockwise(newState.F);
    const temp = [newState.U[0], newState.U[1], newState.U[2]];
    [newState.U[0], newState.U[1], newState.U[2]] = [newState.R[0], newState.R[3], newState.R[6]];
    [newState.R[0], newState.R[3], newState.R[6]] = [newState.D[8], newState.D[7], newState.D[6]];
    [newState.D[8], newState.D[7], newState.D[6]] = [newState.L[8], newState.L[5], newState.L[2]];
    [newState.L[8], newState.L[5], newState.L[2]] = temp;
  }

  //Clockwise back face rotation (B)
  if (move === 'B') {
    newState.B = rotateFaceClockwise(newState.B);
    const temp = [newState.U[8], newState.U[7], newState.U[6]];
    [newState.U[8], newState.U[7], newState.U[6]] = [newState.R[8], newState.R[5], newState.R[2]];
    [newState.R[8], newState.R[5], newState.R[2]] = [newState.D[0], newState.D[1], newState.D[2]];
    [newState.D[0], newState.D[1], newState.D[2]] = [newState.L[0], newState.L[3], newState.L[6]];
    [newState.L[0], newState.L[3], newState.L[6]] = temp;
  }
  //Counterclockwise back face rotation (B')
  if (move === "B'") {
    newState.B = rotateFaceCounterClockwise(newState.B);
    const temp = [newState.U[8], newState.U[7], newState.U[6]];
    [newState.U[8], newState.U[7], newState.U[6]] = [newState.L[0], newState.L[3], newState.L[6]];
    [newState.L[0], newState.L[3], newState.L[6]] = [newState.D[0], newState.D[1], newState.D[2]];
    [newState.D[0], newState.D[1], newState.D[2]] = [newState.R[8], newState.R[5], newState.R[2]];
    [newState.R[8], newState.R[5], newState.R[2]] = temp;
  }

  //Clockwise down face rotation (D)
  if (move === 'D') {
    newState.D = rotateFaceCounterClockwise(newState.D);
    const temp = [newState.F[6], newState.F[7], newState.F[8]];
    [newState.F[6], newState.F[7], newState.F[8]] = [newState.L[6], newState.L[7], newState.L[8]];
    [newState.L[6], newState.L[7], newState.L[8]] = [newState.B[6], newState.B[7], newState.B[8]];
    [newState.B[6], newState.B[7], newState.B[8]] = [newState.R[6], newState.R[7], newState.R[8]];
    [newState.R[6], newState.R[7], newState.R[8]] = temp;
  }
  //Counterclockwise down face rotation (D')
  if (move === "D'") {
    newState.D = rotateFaceClockwise(newState.D);
    const temp = [newState.F[6], newState.F[7], newState.F[8]];
    [newState.F[6], newState.F[7], newState.F[8]] = [newState.R[6], newState.R[7], newState.R[8]];
    [newState.R[6], newState.R[7], newState.R[8]] = [newState.B[6], newState.B[7], newState.B[8]];
    [newState.B[6], newState.B[7], newState.B[8]] = [newState.L[6], newState.L[7], newState.L[8]];
    [newState.L[6], newState.L[7], newState.L[8]] = temp;
  }

  // M slice — middle column, same direction as L (top to front)
  if (move === 'M') {
    const temp = [newState.F[7], newState.F[4], newState.F[1]];
    [newState.F[1], newState.F[4], newState.F[7]] = [newState.U[7], newState.U[4], newState.U[1]];
    [newState.U[7], newState.U[4], newState.U[1]] = [newState.B[7], newState.B[4], newState.B[1]];
    [newState.B[7], newState.B[4], newState.B[1]] = [newState.D[7], newState.D[4], newState.D[1]];
    [newState.D[1], newState.D[4], newState.D[7]] = temp;
  }
  // M' — opposite of M
  if (move === "M'") {
    const temp = [newState.F[7], newState.F[4], newState.F[1]];
    [newState.F[1], newState.F[4], newState.F[7]] = [newState.D[7], newState.D[4], newState.D[1]];
    [newState.D[1], newState.D[4], newState.D[7]] = [newState.B[1], newState.B[4], newState.B[7]];
    [newState.B[1], newState.B[4], newState.B[7]] = [newState.U[1], newState.U[4], newState.U[7]];
    [newState.U[1], newState.U[4], newState.U[7]] = temp;
  }

  // E slice — middle row, same direction as D (front to right)
  if (move === 'E') {
  const temp = [newState.F[3], newState.F[4], newState.F[5]];
    [newState.F[3], newState.F[4], newState.F[5]] = [newState.L[3], newState.L[4], newState.L[5]];
    [newState.L[3], newState.L[4], newState.L[5]] = [newState.B[3], newState.B[4], newState.B[5]];
    [newState.B[3], newState.B[4], newState.B[5]] = [newState.R[3], newState.R[4], newState.R[5]];
    [newState.R[3], newState.R[4], newState.R[5]] = temp;
  }
  // E' — opposite of E
  if (move === "E'") {
  const temp = [newState.F[3], newState.F[4], newState.F[5]];
    [newState.F[3], newState.F[4], newState.F[5]] = [newState.R[3], newState.R[4], newState.R[5]];
    [newState.R[3], newState.R[4], newState.R[5]] = [newState.B[3], newState.B[4], newState.B[5]];
    [newState.B[3], newState.B[4], newState.B[5]] = [newState.L[3], newState.L[4], newState.L[5]];
    [newState.L[3], newState.L[4], newState.L[5]] = temp;
  }

  // S slice — middle slice, same direction as F (top to right)
  if (move === 'S') {
    const temp = [newState.U[5], newState.U[4], newState.U[3]];
    [newState.U[5], newState.U[4], newState.U[3]] = [newState.L[1], newState.L[4], newState.L[7]];
    [newState.L[1], newState.L[4], newState.L[7]] = [newState.D[3], newState.D[4], newState.D[5]];
    [newState.D[3], newState.D[4], newState.D[5]] = [newState.R[7], newState.R[4], newState.R[1]];
    [newState.R[7], newState.R[4], newState.R[1]] = temp;
  }
  // S' — opposite of S
  if (move === "S'") {
    const temp = [newState.U[5], newState.U[4], newState.U[3]];
    [newState.U[5], newState.U[4], newState.U[3]] = [newState.R[7], newState.R[4], newState.R[1]];
    [newState.R[7], newState.R[4], newState.R[1]] = [newState.D[3], newState.D[4], newState.D[5]];
    [newState.D[3], newState.D[4], newState.D[5]] = [newState.L[1], newState.L[4], newState.L[7]];
    [newState.L[1], newState.L[4], newState.L[7]] = temp;
  }

  if (move === 'x') {
    return applyMoveSequence(newState, ['R', "M'", "L'"]);
  }
  if (move === "x'") {
    return applyMoveSequence(newState, ["R'", 'M', 'L']);
  }
  if (move === 'y') {
    return applyMoveSequence(newState, ['U', "E'", "D'"]);
  }
  if (move === "y'") {
    return applyMoveSequence(newState, ["U'", 'E', 'D']);
  }
  if (move === 'z') {
    return applyMoveSequence(newState, ['F', 'S', "B'"]);
  }
  if (move === "z'") {
    return applyMoveSequence(newState, ["F'", "S'", 'B']);
  }

  return(newState);
}
