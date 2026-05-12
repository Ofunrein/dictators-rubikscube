/**
 * simulatorAnimation.ts — 3D animation config and cubie geometry helpers
 *
 * Defines the timing constants and per-move rotation descriptors that drive
 * the Three.js animation loop. Translates a standard Rubik's Cube move token
 * (e.g. "R", "U'", "2F") into the axis, layer set, and direction that the
 * renderer needs to animate the correct cubies.
 *
 * Key exports:
 *   - TURN_DURATION_SECONDS, SOLVE_TURN_DURATION_SECONDS — animation speeds
 *   - IDLE_ROTATION_SPEED — speed of the passive rotation when no move is playing
 *   - parseMoveAnimation(move, size) — converts a move token into an animation descriptor
 *   - getCubieLayout(size) — returns the 3D positions of all cubies for a given size
 *   - easeInOutCubic(t) — easing function used by the render loop
 */

import {
  buildCubieLayout,
  getCoordinateValues,
  normalizeCubeSize,
  type CubieLayout,
} from '../../cube/cubeModel.js';

export const TURN_DURATION_SECONDS = 0.24;
export const SOLVE_TURN_DURATION_SECONDS = 0.46;
export const IDLE_ROTATION_SPEED = 0.22;

type Axis = 'x' | 'y' | 'z';
type LayerName = 'max' | 'min' | 'innerMax' | 'innerMin' | 'middle' | 'all';

interface BaseMoveAnimation {
  axis: Axis;
  layer: LayerName;
  direction: number;
  requiredSizes?: number[];
  requiresOddSize?: boolean;
}

const BASE_MOVE_ANIMATIONS: Record<string, BaseMoveAnimation> = {
  U: { axis: 'y', layer: 'max', direction: 1 },
  D: { axis: 'y', layer: 'min', direction: -1 },
  R: { axis: 'x', layer: 'max', direction: -1 },
  L: { axis: 'x', layer: 'min', direction: 1 },
  F: { axis: 'z', layer: 'max', direction: -1 },
  B: { axis: 'z', layer: 'min', direction: 1 },
  u: { axis: 'y', layer: 'innerMax', direction: 1, requiredSizes: [4] },
  d: { axis: 'y', layer: 'innerMin', direction: -1, requiredSizes: [4] },
  r: { axis: 'x', layer: 'innerMax', direction: -1, requiredSizes: [4] },
  l: { axis: 'x', layer: 'innerMin', direction: 1, requiredSizes: [4] },
  f: { axis: 'z', layer: 'innerMax', direction: -1, requiredSizes: [4] },
  b: { axis: 'z', layer: 'innerMin', direction: 1, requiredSizes: [4] },
  M: { axis: 'x', layer: 'middle', direction: 1, requiresOddSize: true },
  E: { axis: 'y', layer: 'middle', direction: -1, requiresOddSize: true },
  S: { axis: 'z', layer: 'middle', direction: -1, requiresOddSize: true },
  x: { axis: 'x', layer: 'all', direction: -1 },
  y: { axis: 'y', layer: 'all', direction: 1 },
  z: { axis: 'z', layer: 'all', direction: -1 },
};

function resolveAnimationLayer(size: number, layer: LayerName): number | 'all' {
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

export function getCubieLayout(size: number = 3): CubieLayout[] {
  return buildCubieLayout(size);
}

export const CUBIE_LAYOUT = getCubieLayout(3);

export interface MoveAnimation {
  axis: Axis;
  layer: number | 'all';
  direction: number;
}

export function parseMoveAnimation(move: string, size: number = 3): MoveAnimation | null {
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

export function easeInOutCubic(t: number): number {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function snap(value: number): number {
  return Math.round(value * 2) / 2;
}

export interface CubiePosition {
  x: number;
  y: number;
  z: number;
  [key: string]: unknown;
}

export function rotateCubiePosition(
  position: CubiePosition,
  axis: Axis,
  direction: number,
): CubiePosition {
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

export {
  inverseMove,
  isSliceMove,
  expandMoveToken,
  normalizeMoveSequence,
  invertMoveSequence,
  mergeMoveIntoSolveStack,
} from './moveNotation.js';
