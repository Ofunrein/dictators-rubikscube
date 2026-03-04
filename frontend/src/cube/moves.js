/**
 * Supported move tokens for a basic 3x3 cube.
 */
export const MOVES = ['U', 'D', 'L', 'R', 'F', 'B', "U'", "D'", "L'", "R'", "F'", "B'"];

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

/**
 * Apply a move to a cube state.
 * Placeholder implementation until move logic is implemented.
 * @param {object} cubeState
 * @param {string} move
 * @returns {object}
 */
export function applyMove(cubeState, move) {
  const newState = JSON.parse(JSON.stringify(cubeState)); // Deep copy for immutability

  // Clockwise upper face rotation (U)
  if (move === 'U') {
    newState.U = rotateFaceClockwise(newState.U);
    const temp = [newState.F[0], newState.F[1], newState.F[2]];
    [newState.F[0], newState.F[1], newState.F[2]] = [newState.L[0], newState.L[1], newState.L[2]];
    [newState.L[0], newState.L[1], newState.L[2]] = [newState.B[0], newState.B[1], newState.B[2]];
    [newState.B[0], newState.B[1], newState.B[2]] = [newState.R[0], newState.R[1], newState.R[2]];
    [newState.R[0], newState.R[1], newState.R[2]] = temp;
  }
  // Counterclockwise upper face rotation (U')
  if (move === "U'") {
    newState.U = rotateFaceCounterClockwise(newState.U);
    const temp = [newState.F[0], newState.F[1], newState.F[2]];
    [newState.F[0], newState.F[1], newState.F[2]] = [newState.R[0], newState.R[1], newState.R[2]];
    [newState.R[0], newState.R[1], newState.R[2]] = [newState.B[0], newState.B[1], newState.B[2]];
    [newState.B[0], newState.B[1], newState.B[2]] = [newState.L[0], newState.L[1], newState.L[2]];
    [newState.L[0], newState.L[1], newState.L[2]] = temp;
  }

  // Clockwise right face rotation (R)
  if (move === 'R') {
    newState.R = rotateFaceClockwise(newState.R);
    const temp = [newState.F[2], newState.F[5], newState.F[8]];
    [newState.F[2], newState.F[5], newState.F[8]] = [newState.D[2], newState.D[5], newState.D[8]];
    [newState.D[2], newState.D[5], newState.D[8]] = [newState.B[6], newState.B[3], newState.B[0]];
    [newState.B[6], newState.B[3], newState.B[0]] = [newState.U[2], newState.U[5], newState.U[8]];
    [newState.U[2], newState.U[5], newState.U[8]] = temp;
  }
  // Counterclockwise right face rotation (R')
  if (move === "R'") {
    newState.R = rotateFaceCounterClockwise(newState.R);
    const temp = [newState.F[2], newState.F[5], newState.F[8]];
    [newState.F[2], newState.F[5], newState.F[8]] = [newState.U[2], newState.U[5], newState.U[8]];
    [newState.U[2], newState.U[5], newState.U[8]] = [newState.B[6], newState.B[3], newState.B[0]];
    [newState.B[6], newState.B[3], newState.B[0]] = [newState.D[2], newState.D[5], newState.D[8]];
    [newState.D[2], newState.D[5], newState.D[8]] = temp;
  }

  //Clockwise left face rotation (L)
  if (move === 'L') {
    newState.L = rotateFaceClockwise(newState.L);
    const temp = [newState.F[0], newState.F[3], newState.F[6]];
    [newState.F[0], newState.F[3], newState.F[6]] = [newState.U[0], newState.U[3], newState.U[6]];
    [newState.U[0], newState.U[3], newState.U[6]] = [newState.B[8], newState.B[5], newState.B[2]];
    [newState.B[8], newState.B[5], newState.B[2]] = [newState.D[0], newState.D[3], newState.D[6]];
    [newState.D[0], newState.D[3], newState.D[6]] = temp;
  }
  //Counterclockwise left face rotation (L')
  if (move === "L'") {
    newState.L = rotateFaceCounterClockwise(newState.L);
    const temp = [newState.F[0], newState.F[3], newState.F[6]];
    [newState.F[0], newState.F[3], newState.F[6]] = [newState.D[0], newState.D[3], newState.D[6]];
    [newState.D[0], newState.D[3], newState.D[6]] = [newState.B[8], newState.B[5], newState.B[2]];
    [newState.B[8], newState.B[5], newState.B[2]] = [newState.U[0], newState.U[3], newState.U[6]];
    [newState.U[0], newState.U[3], newState.U[6]] = temp;
  }

  //Clockwise front face rotation (F)
  if (move === 'F') {
    newState.F = rotateFaceClockwise(newState.F);
    const temp = [newState.U[6], newState.U[7], newState.U[8]];
    [newState.U[6], newState.U[7], newState.U[8]] = [newState.L[2], newState.L[5], newState.L[8]];
    [newState.L[2], newState.L[5], newState.L[8]] = [newState.D[2], newState.D[1], newState.D[0]];
    [newState.D[2], newState.D[1], newState.D[0]] = [newState.R[0], newState.R[3], newState.R[6]];
    [newState.R[0], newState.R[3], newState.R[6]] = temp;
  }
  //Counterclockwise front face rotation (F')
  if (move === "F'") {
    newState.F = rotateFaceCounterClockwise(newState.F);
    const temp = [newState.U[6], newState.U[7], newState.U[8]];
    [newState.U[6], newState.U[7], newState.U[8]] = [newState.R[0], newState.R[3], newState.R[6]];
    [newState.R[0], newState.R[3], newState.R[6]] = [newState.D[2], newState.D[1], newState.D[0]];
    [newState.D[2], newState.D[1], newState.D[0]] = [newState.L[2], newState.L[5], newState.L[8]];
    [newState.L[2], newState.L[5], newState.L[8]] = temp;
  }

  //Clockwise back face rotation (B)
  if (move === 'B') {
    newState.B = rotateFaceClockwise(newState.B);
    const temp = [newState.U[0], newState.U[1], newState.U[2]];
    [newState.U[0], newState.U[1], newState.U[2]] = [newState.R[2], newState.R[5], newState.R[8]];
    [newState.R[2], newState.R[5], newState.R[8]] = [newState.D[8], newState.D[7], newState.D[6]];
    [newState.D[8], newState.D[7], newState.D[6]] = [newState.L[0], newState.L[3], newState.L[6]];
    [newState.L[0], newState.L[3], newState.L[6]] = temp;
  }
  //Counterclockwise back face rotation (B')
  if (move === "B'") {
    newState.B = rotateFaceCounterClockwise(newState.B);
    const temp = [newState.U[0], newState.U[1], newState.U[2]];
    [newState.U[0], newState.U[1], newState.U[2]] = [newState.L[0], newState.L[3], newState.L[6]];
    [newState.L[0], newState.L[3], newState.L[6]] = [newState.D[8], newState.D[7], newState.D[6]];
    [newState.D[8], newState.D[7], newState.D[6]] = [newState.R[2], newState.R[5], newState.R[8]];
    [newState.R[2], newState.R[5], newState.R[8]] = temp;
  }

  return(newState);
}
