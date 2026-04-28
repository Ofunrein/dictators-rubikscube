/**
 * moves.js — Size-aware move engine shared by the frontend and backend
 *
 * Instead of hardcoding sticker swaps for a single 3x3 layout, this version
 * converts the cube into sticker coordinates, rotates the stickers that belong
 * to the requested layer, then rebuilds the face arrays. That lets the same
 * code handle 2x2, 3x3, and 4x4 cubes.
 *
 * Supported manual moves:
 *   - Face turns: U D L R F B (+ primes and doubles)
 *   - Slice moves: M E S (+ primes and doubles) on odd cubes like 3x3
 *   - 4x4 inner slices: r l u d f b (+ primes and doubles)
 *   - Cube rotations: x y z (+ primes and doubles)
 *
 * Beginner note:
 *   Uppercase letters are OUTER face turns.
 *   Lowercase letters in 4x4 mode are the INNER layer next to that face.
 *   Example: R turns the outside right layer, while r turns the inside right layer.
 */

import {
  cloneCubeState,
  createStickerModel,
  getCoordinateValues,
  getFaceSize,
  normalizeCubeSize,
  stickersToState,
} from './cubeModel.js';

const BASE_MOVE_CONFIGS = {
  U: { axis: 'y', layer: 'max', direction: -1 },
  D: { axis: 'y', layer: 'min', direction: 1 },
  R: { axis: 'x', layer: 'max', direction: -1 },
  L: { axis: 'x', layer: 'min', direction: 1 },
  F: { axis: 'z', layer: 'max', direction: -1 },
  B: { axis: 'z', layer: 'min', direction: 1 },
  // Lowercase moves are the 4x4 inner layers next to the matching outer face.
  u: { axis: 'y', layer: 'innerMax', direction: -1, requiredSizes: [4] },
  d: { axis: 'y', layer: 'innerMin', direction: 1, requiredSizes: [4] },
  r: { axis: 'x', layer: 'innerMax', direction: -1, requiredSizes: [4] },
  l: { axis: 'x', layer: 'innerMin', direction: 1, requiredSizes: [4] },
  f: { axis: 'z', layer: 'innerMax', direction: -1, requiredSizes: [4] },
  b: { axis: 'z', layer: 'innerMin', direction: 1, requiredSizes: [4] },
  M: { axis: 'x', layer: 'middle', direction: 1, requiresOddSize: true },
  E: { axis: 'y', layer: 'middle', direction: 1, requiresOddSize: true },
  S: { axis: 'z', layer: 'middle', direction: -1, requiresOddSize: true },
  x: { axis: 'x', layer: 'all', direction: -1 },
  y: { axis: 'y', layer: 'all', direction: -1 },
  z: { axis: 'z', layer: 'all', direction: -1 },
};

const MOVE_TOKEN_PATTERN = /^([URFDLBMESxyzrludfb])(2|')?$/;

function getBaseMoveTokens(size) {
  const normalizedSize = normalizeCubeSize(size);
  const moves = ['U', 'D', 'L', 'R', 'F', 'B'];

  if (normalizedSize === 4) {
    moves.push('u', 'd', 'r', 'l', 'f', 'b');
  }

  if (normalizedSize % 2 === 1) {
    moves.push('M', 'E', 'S');
  }

  moves.push('x', 'y', 'z');
  return moves;
}

export function getSupportedMoves(size = 3) {
  return getBaseMoveTokens(size).flatMap((move) => [move, `${move}'`, `${move}2`]);
}

export const MOVES = getSupportedMoves(3);

export function expandMoveToken(move) {
  const token = move?.trim();
  if (!token) return [];

  const match = token.match(MOVE_TOKEN_PATTERN);
  if (!match) {
    return [];
  }

  const [, baseMove, modifier = ''] = match;
  if (modifier === '2') {
    return [baseMove, baseMove];
  }

  return [modifier === "'" ? `${baseMove}'` : baseMove];
}

export function normalizeMoveSequence(sequence) {
  return sequence.flatMap(expandMoveToken);
}

export function isSupportedMove(move, size = 3) {
  const normalizedMoves = expandMoveToken(move);
  if (normalizedMoves.length === 0) {
    return false;
  }

  const allowedMoves = new Set(getSupportedMoves(size));
  return normalizedMoves.every((token) => allowedMoves.has(token));
}

function resolveLayerValue(size, layer) {
  if (layer === 'all') {
    return 'all';
  }

  const coords = getCoordinateValues(size);
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

function parseSingleMove(move, size) {
  const token = move?.trim();
  if (!token) return null;

  const isPrime = token.endsWith("'");
  const baseMove = isPrime ? token.slice(0, -1) : token;
  const config = BASE_MOVE_CONFIGS[baseMove];

  if (!config) {
    return null;
  }

  if (config.requiredSizes && !config.requiredSizes.includes(size)) {
    return null;
  }

  if (config.requiresOddSize && size % 2 === 0) {
    return null;
  }

  return {
    ...config,
    direction: isPrime ? -config.direction : config.direction,
    layerValue: resolveLayerValue(size, config.layer),
  };
}

// Rotates a 3D vector 90 degrees around one axis.
// This is the core math that makes moves work. When you turn a layer,
// every sticker in that layer rotates 90 degrees around the layer's axis.
//
// The formulas come from standard 3D rotation matrices:
//   - Rotating around X: Y and Z swap (with a sign flip for direction)
//   - Rotating around Y: X and Z swap
//   - Rotating around Z: X and Y swap
//
// direction > 0 = clockwise when looking down the positive axis
// direction < 0 = counter-clockwise
function rotateVector({ x, y, z }, axis, direction) {
  if (axis === 'x') {
    return direction > 0 ? { x, y: -z, z: y } : { x, y: z, z: -y };
  }

  if (axis === 'y') {
    return direction > 0 ? { x: z, y, z: -x } : { x: -z, y, z: x };
  }

  return direction > 0 ? { x: -y, y: x, z } : { x: y, y: -x, z };
}

function shouldRotateSticker(sticker, config) {
  if (config.layerValue === 'all') {
    return true;
  }
  return sticker[config.axis] === config.layerValue;
}

// Rotates a single sticker's position AND its normal vector.
// The position tells us where the sticker is in 3D space.
// The normal tells us which face it belongs to (e.g. nx=1 means it's on the R face).
// Both must rotate together so the sticker ends up on the correct face.
function rotateSticker(sticker, axis, direction) {
  const position = rotateVector(sticker, axis, direction);
  const normal = rotateVector(
    { x: sticker.nx, y: sticker.ny, z: sticker.nz },
    axis,
    direction,
  );

  return {
    ...sticker,
    x: position.x,
    y: position.y,
    z: position.z,
    nx: normal.x,
    ny: normal.y,
    nz: normal.z,
  };
}

// The main single-move pipeline:
// 1. Parse the move token into an axis/layer/direction config
// 2. Convert the flat face-array state into 3D sticker objects
// 3. Rotate stickers that belong to the target layer
// 4. Convert the rotated stickers back to a flat face-array state
function applySingleMove(cubeState, move, size) {
  const config = parseSingleMove(move, size);
  if (!config) {
    return cloneCubeState(cubeState);
  }

  const stickers = createStickerModel(cubeState).map((sticker) => (
    shouldRotateSticker(sticker, config)
      ? rotateSticker(sticker, config.axis, config.direction)
      : sticker
  ));

  return stickersToState(stickers, size);
}

// Public API: apply a single move (like "R" or "U'") to a cube state.
// Handles double moves like "R2" by expanding them to ["R", "R"] first.
// Uses reduce to chain moves: each move's output state becomes the next move's input.
export function applyMove(cubeState, move) {
  const size = normalizeCubeSize(getFaceSize(cubeState));
  const normalizedMoves = expandMoveToken(move);

  if (normalizedMoves.length === 0) {
    return cloneCubeState(cubeState);
  }

  return normalizedMoves.reduce(
    (state, token) => applySingleMove(state, token, size),
    cloneCubeState(cubeState),
  );
}

// Public API: apply a whole sequence of moves to a state.
// Used by the backend to replay scrambles and verify solver output.
export function applyMoves(initialState, moves) {
  const size = normalizeCubeSize(getFaceSize(initialState));
  const normalizedMoves = normalizeMoveSequence(moves);

  return normalizedMoves.reduce(
    (state, token) => applySingleMove(state, token, size),
    cloneCubeState(initialState),
  );
}
