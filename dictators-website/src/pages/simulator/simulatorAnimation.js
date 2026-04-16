/**
 * simulatorAnimation.js
 *
 * Everything the 3D cube needs to animate moves and manage move sequences.
 *
 * Key concepts for beginners:
 *
 *   MOVE NOTATION
 *   A Rubik's Cube has 6 faces: U (Up), D (Down), R (Right), L (Left), F (Front), B (Back).
 *   A letter by itself (e.g. "R") means turn that face 90 degrees clockwise.
 *   A letter followed by a prime symbol (e.g. "R'") means counter-clockwise.
 *   M, E, S are "slice" moves — they turn the MIDDLE layer instead of an outer face.
 *
 *   MOVE_ANIMATIONS
 *   Maps each move token to the 3D axis, layer index, and rotation direction that
 *   Three.js needs to visually rotate the correct cubies. For example:
 *     R → rotate the x-axis layer at position +1 (the rightmost column)
 *     M → rotate the x-axis layer at position 0 (the middle column)
 *
 *   CUBIE_LAYOUT
 *   A 3×3×3 grid of positions from (-1,-1,-1) to (1,1,1). Each position is one
 *   physical cubie in the 3D scene. The animation system uses this to figure out
 *   which cubies belong to the layer being turned.
 *
 * Functions exported:
 *   parseMoveAnimation(move)       → { axis, layer, direction } for Three.js
 *   easeInOutCubic(t)              → smooth animation curve (starts slow, speeds up, slows down)
 *   inverseMove(move)              → "R" → "R'", "R'" → "R"
 *   isSliceMove(move)              → true for M, E, S moves
 *   invertMoveSequence(sequence)   → reverses and inverts an entire move array (used by Solve)
 *   mergeMoveIntoSolveStack(stack) → tracks user moves; cancels out if last move was the inverse
 *   expandMoveToken(move)          → handles double moves like "R2" → ["R", "R"]
 *   normalizeMoveSequence(seq)     → expands all tokens in a sequence
 *   rotateCubiePosition(pos,axis,dir) → computes where a cubie ends up after a 90° rotation
 */

// How long each animated turn takes (in seconds).
// Manual moves are fast (0.24s), solver replay is slower (0.46s) so users can follow along.
export const TURN_DURATION_SECONDS = 0.24;
export const SOLVE_TURN_DURATION_SECONDS = 0.46;
export const IDLE_ROTATION_SPEED = 0.22;

// Direction values are for clockwise turns of each face token.
// "axis" = which 3D axis the layer rotates around (x = left/right, y = up/down, z = front/back)
// "layer" = which slice along that axis (-1 = far side, 0 = middle, 1 = near side)
// "direction" = 1 or -1, controls clockwise vs counter-clockwise in 3D space
export const MOVE_ANIMATIONS = {
  // Standard face turns — each one rotates the outer layer on its axis
  U: { axis: 'y', layer: 1, direction: 1 },      // Up face = top row, Y axis
  D: { axis: 'y', layer: -1, direction: -1 },     // Down face = bottom row, Y axis
  R: { axis: 'x', layer: 1, direction: -1 },      // Right face = rightmost column, X axis
  L: { axis: 'x', layer: -1, direction: 1 },      // Left face = leftmost column, X axis
  F: { axis: 'z', layer: 1, direction: -1 },      // Front face = front slice, Z axis
  B: { axis: 'z', layer: -1, direction: 1 },      // Back face = back slice, Z axis
  // Middle slices — the center layer between two outer faces
  M: { axis: 'x', layer: 0, direction: 1 },       // M = middle column (between L and R), same direction as L
  E: { axis: 'y', layer: 0, direction: -1 },      // E = middle row (between U and D), same direction as D
  S: { axis: 'z', layer: 0, direction: -1 },      // S = middle slice (between F and B), same direction as F
  // Whole-cube rotations — turns all 3 layers at once, like picking up the cube and rotating it
  x: { axis: 'x', layer: 'all', direction: -1 },  // x = rotate entire cube around X axis (like R but all layers)
  y: { axis: 'y', layer: 'all', direction: 1 },   // y = rotate entire cube around Y axis (like U but all layers)
  z: { axis: 'z', layer: 'all', direction: -1 },  // z = rotate entire cube around Z axis (like F but all layers)
};

// Build a flat list of all 27 cubie positions in a 3x3x3 grid.
// Each cubie has (x, y, z) coordinates ranging from -1 to +1.
// The center cubie is at (0,0,0). Corner cubies are at positions like (1,1,1).
// This layout is used by the animation system to figure out which cubies
// belong to the layer being rotated (e.g. all cubies where x === 1 are in the R layer).
export const CUBIE_LAYOUT = [];
for (let x = -1; x <= 1; x += 1) {
  for (let y = -1; y <= 1; y += 1) {
    for (let z = -1; z <= 1; z += 1) {
      CUBIE_LAYOUT.push({
        key: `${x}-${y}-${z}`,
        x,
        y,
        z,
        position: [x, y, z],
      });
    }
  }
}

// Given a move string like "R" or "R'", figure out which axis, layer, and direction
// the animation needs. Returns null if the move isn't recognized.
export function parseMoveAnimation(move) {
  if (typeof move !== 'string' || move.length === 0) {
    return null;
  }

  const token = move.trim();
  if (!token) {
    return null;
  }

  const baseMove = token.replace("'", '');
  const config = MOVE_ANIMATIONS[baseMove];
  if (!config) return null;
  return {
    ...config,
    direction: token.endsWith("'") ? -config.direction : config.direction,
  };
}

// Easing function for smooth animations. Makes the turn start slow,
// speed up in the middle, and slow down at the end (feels more natural).
export function easeInOutCubic(t) {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Flip a move to its opposite: "R" becomes "R'" (counter-clockwise), "R'" becomes "R".
export function inverseMove(move) {
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

// Returns true if the move is a middle-slice move (M, E, or S).
// The C++ solver can't handle these, so when slice moves are in the history,
// the frontend uses local inverse-history solving instead of calling the API.
export function isSliceMove(move) {
  return /^[MES]'?$/.test(move?.trim?.() ?? '');
}

// Reverse an entire move sequence and invert each move.
// For example: ["R", "U'", "F"] → ["F'", "U", "R'"]
// This is how the Solve button works when using local history:
// undo every move the user made, in reverse order.
export function invertMoveSequence(sequence) {
  return [...normalizeMoveSequence(sequence)].reverse().map(inverseMove);
}

// Keeps a running log of user moves for the Solve button.
// If the last move on the stack is the inverse of the new move, they cancel out
// (like doing R then R' = nothing happened), so we pop instead of push.
// This keeps the stack as short as possible.
export function mergeMoveIntoSolveStack(stack, move) {
  const inverse = inverseMove(move);
  if (stack.length > 0 && stack[stack.length - 1] === inverse) {
    stack.pop();
    return;
  }
  stack.push(move);
}

// Handles shorthand notation: "R2" means "do R twice" → ["R", "R"].
// Single moves like "R" or "R'" pass through unchanged.
export function expandMoveToken(move) {
  const token = move?.trim();
  if (!token) return [];
  if (/^[URFDLBMESxyz]2$/.test(token)) {
    return [token[0], token[0]];
  }
  if (/^[URFDLBMESxyz]'?$/.test(token)) {
    return [token];
  }
  return [];
}

export function normalizeMoveSequence(sequence) {
  return sequence.flatMap(expandMoveToken);
}

// After a 90-degree rotation, a cubie moves to a new grid position.
// This does the math: given a cubie at (x,y,z), which axis it rotated around,
// and which direction, compute where it ends up.
// For example: rotating around Y axis clockwise moves (1,0,0) to (0,0,-1).
// This is basic 3D rotation math using the right-hand rule.
export function rotateCubiePosition(position, axis, direction) {
  const { x, y, z } = position;

  if (axis === 'x') {
    return direction > 0
      ? { ...position, y: -z, z: y }
      : { ...position, y: z, z: -y };
  }

  if (axis === 'y') {
    return direction > 0
      ? { ...position, x: z, z: -x }
      : { ...position, x: -z, z: x };
  }

  return direction > 0
    ? { ...position, x: -y, y: x }
    : { ...position, x: y, y: -x };
}
