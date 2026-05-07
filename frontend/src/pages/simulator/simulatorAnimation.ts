/**
 * simulatorAnimation.js — 3D animation config and cubie geometry
 *
 * This file handles the 3D side of cube moves: which axis to rotate,
 * which layer, how fast, and where cubies end up after a turn.
 *
 * Move notation string helpers (inverseMove, expandMoveToken, etc.) now live
 * in moveNotation.js and are re-exported from here for backward compatibility.
 *
 * Key concepts:
 *
 *   MOVE_ANIMATIONS
 *   Maps each move token to the 3D axis, layer index, and rotation direction that
 *   Three.js needs to visually rotate the correct cubies. For example:
 *     R → rotate the x-axis layer at position +1 (the rightmost column)
 *     M → rotate the x-axis layer at position 0 (the middle column)
 *
 *   CUBIE_LAYOUT
 *   A grid of positions (e.g. -1 to 1 for 3x3). Each position is one
 *   physical cubie in the 3D scene. The animation system uses this to figure out
 *   which cubies belong to the layer being turned.
 *
 * Exports:
 *   parseMoveAnimation(move, size)       → { axis, layer, direction } for Three.js
 *   easeInOutCubic(t)                    → smooth animation curve
 *   rotateCubiePosition(pos, axis, dir)  → cubie position after a 90° rotation
 *   getCubieLayout(size)                 → grid of cubie positions
 *   TURN_DURATION_SECONDS                → animation speed for manual moves
 *   SOLVE_TURN_DURATION_SECONDS          → slower speed for solver replay
 */

import {
  buildCubieLayout,
  getCoordinateValues,
  normalizeCubeSize,
} from '../../cube/cubeModel.js';

// How long each animated turn takes (in seconds).
// Manual moves are fast (0.24s), solver replay is slower (0.46s) so users can follow along.
export const TURN_DURATION_SECONDS = 0.24;
export const SOLVE_TURN_DURATION_SECONDS = 0.46;
export const IDLE_ROTATION_SPEED = 0.22;

// Direction values are for clockwise turns of each face token.
// "axis" = which 3D axis the layer rotates around (x = left/right, y = up/down, z = front/back)
// "layer" = which slice along that axis (-1 = far side, 0 = middle, 1 = near side)
// "direction" = 1 or -1, controls clockwise vs counter-clockwise in 3D space
const BASE_MOVE_ANIMATIONS = {
  // Standard face turns — each one rotates the outer layer on its axis
  U: { axis: 'y', layer: 'max', direction: 1 },      // Up face = top row, Y axis
  D: { axis: 'y', layer: 'min', direction: -1 },     // Down face = bottom row, Y axis
  R: { axis: 'x', layer: 'max', direction: -1 },     // Right face = rightmost column, X axis
  L: { axis: 'x', layer: 'min', direction: 1 },      // Left face = leftmost column, X axis
  F: { axis: 'z', layer: 'max', direction: -1 },     // Front face = front slice, Z axis
  B: { axis: 'z', layer: 'min', direction: 1 },      // Back face = back slice, Z axis
  // 4x4 inner slices — the inside layer next to a face
  u: { axis: 'y', layer: 'innerMax', direction: 1, requiredSizes: [4] },
  d: { axis: 'y', layer: 'innerMin', direction: -1, requiredSizes: [4] },
  r: { axis: 'x', layer: 'innerMax', direction: -1, requiredSizes: [4] },
  l: { axis: 'x', layer: 'innerMin', direction: 1, requiredSizes: [4] },
  f: { axis: 'z', layer: 'innerMax', direction: -1, requiredSizes: [4] },
  b: { axis: 'z', layer: 'innerMin', direction: 1, requiredSizes: [4] },
  // Middle slices — the center layer between two outer faces
  M: { axis: 'x', layer: 'middle', direction: 1, requiresOddSize: true },       // M = middle column (between L and R), same direction as L
  E: { axis: 'y', layer: 'middle', direction: -1, requiresOddSize: true },      // E = middle row (between U and D), same direction as D
  S: { axis: 'z', layer: 'middle', direction: -1, requiresOddSize: true },      // S = middle slice (between F and B), same direction as F
  // Whole-cube rotations — turns all 3 layers at once, like picking up the cube and rotating it
  x: { axis: 'x', layer: 'all', direction: -1 },  // x = rotate entire cube around X axis (like R but all layers)
  y: { axis: 'y', layer: 'all', direction: 1 },   // y = rotate entire cube around Y axis (like U but all layers)
  z: { axis: 'z', layer: 'all', direction: -1 },  // z = rotate entire cube around Z axis (like F but all layers)
};

function resolveAnimationLayer(size, layer) {
  const coords = getCoordinateValues(size);
  if (layer === 'all') {
    return 'all';
  }

  if (layer === 'max') {
    return coords[coords.length - 1];
  }

  if (layer === 'min') {
    return coords[0];
  }

  if (layer === 'innerMax') {
    return coords[coords.length - 2];
  }

  if (layer === 'innerMin') {
    return coords[1];
  }

  return coords[Math.floor(coords.length / 2)];
}

export function getCubieLayout(size = 3) {
  return buildCubieLayout(size);
}

export const CUBIE_LAYOUT = getCubieLayout(3);

// Given a move string like "R" or "R'", figure out which axis, layer, and direction
// the animation needs. Returns null if the move isn't recognized.
export function parseMoveAnimation(move, size = 3) {
  const normalizedSize = normalizeCubeSize(size);
  if (typeof move !== 'string' || move.length === 0) {
    return null;
  }

  const token = move.trim();
  if (!token) {
    return null;
  }

  const baseMove = token.replace("'", '');
  const config = BASE_MOVE_ANIMATIONS[baseMove];
  if (!config) return null;
  if (config.requiredSizes && !config.requiredSizes.includes(normalizedSize)) {
    return null;
  }
  if (config.requiresOddSize && normalizedSize % 2 === 0) {
    return null;
  }

  return {
    axis: config.axis,
    layer: resolveAnimationLayer(normalizedSize, config.layer),
    direction: token.endsWith("'") ? -config.direction : config.direction,
  };
}

// Easing function for smooth animations. Makes the turn start slow,
// speed up in the middle, and slow down at the end (feels more natural).
export function easeInOutCubic(t) {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// After a 90-degree rotation, a cubie moves to a new grid position.
// This does the math: given a cubie at (x,y,z), which axis it rotated around,
// and which direction, compute where it ends up.
// For example: rotating around Y axis clockwise moves (1,0,0) to (0,0,-1).
// This is basic 3D rotation math using the right-hand rule.
// The snap() call rounds to the nearest 0.5 to prevent floating-point drift
// on 2x2/4x4 cubes where coordinates are non-integer (e.g. -0.5, 0.5, 1.5).
function snap(value) {
  return Math.round(value * 2) / 2;
}

export function rotateCubiePosition(position, axis, direction) {
  const { x, y, z } = position;

  if (axis === 'x') {
    return direction > 0
      ? { ...position, y: snap(-z), z: snap(y) }
      : { ...position, y: snap(z), z: snap(-y) };
  }

  if (axis === 'y') {
    return direction > 0
      ? { ...position, x: snap(z), z: snap(-x) }
      : { ...position, x: snap(-z), z: snap(x) };
  }

  return direction > 0
    ? { ...position, x: snap(-y), y: snap(x) }
    : { ...position, x: snap(y), y: snap(-x) };
}

// Re-export move notation helpers so existing imports don't break.
// New code should import from moveNotation.js directly.
export {
  inverseMove,
  isSliceMove,
  expandMoveToken,
  normalizeMoveSequence,
  invertMoveSequence,
  mergeMoveIntoSolveStack,
} from './moveNotation.js';
