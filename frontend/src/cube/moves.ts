/**
 * moves.ts — Size-aware move engine shared by the frontend and backend
 *
 * Converts the cube into sticker coordinates, rotates the stickers that belong
 * to the requested layer, then rebuilds the face arrays. Handles 2x2, 3x3, and 4x4.
 *
 * Supported moves:
 *   - Face turns: U D L R F B (+ primes and doubles)
 *   - Slice moves: M E S (+ primes and doubles) on odd cubes
 *   - 4x4 inner slices: r l u d f b (+ primes and doubles)
 *   - Cube rotations: x y z (+ primes and doubles)
 */

import {
  cloneCubeState,
  createStickerModel,
  CubeState,
  getCoordinateValues,
  getFaceSize,
  normalizeCubeSize,
  StickerModel,
  stickersToState,
} from './cubeModel.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type Axis = 'x' | 'y' | 'z';
type LayerSpec = 'max' | 'min' | 'innerMax' | 'innerMin' | 'middle' | 'all';

interface MoveConfig {
  axis: Axis;
  layer: LayerSpec;
  direction: number;
  requiredSizes?: number[];
  requiresOddSize?: boolean;
}

interface ResolvedMoveConfig extends MoveConfig {
  layerValue: number | 'all';
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_MOVE_CONFIGS: Record<string, MoveConfig> = {
  U: { axis: 'y', layer: 'max', direction: -1 },
  D: { axis: 'y', layer: 'min', direction: 1 },
  R: { axis: 'x', layer: 'max', direction: -1 },
  L: { axis: 'x', layer: 'min', direction: 1 },
  F: { axis: 'z', layer: 'max', direction: -1 },
  B: { axis: 'z', layer: 'min', direction: 1 },
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

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getBaseMoveTokens(size: number): string[] {
  const normalizedSize = normalizeCubeSize(size);
  const moves = ['U', 'D', 'L', 'R', 'F', 'B'];
  if (normalizedSize === 4) moves.push('u', 'd', 'r', 'l', 'f', 'b');
  if (normalizedSize % 2 === 1) moves.push('M', 'E', 'S');
  moves.push('x', 'y', 'z');
  return moves;
}

function resolveLayerValue(size: number, layer: LayerSpec): number | 'all' {
  if (layer === 'all') return 'all';
  const coords = getCoordinateValues(size);
  if (layer === 'max') return coords[coords.length - 1];
  if (layer === 'min') return coords[0];
  if (layer === 'innerMax') return coords[coords.length - 2];
  if (layer === 'innerMin') return coords[1];
  return coords[Math.floor(coords.length / 2)];
}

function parseSingleMove(move: string, size: number): ResolvedMoveConfig | null {
  const token = move?.trim();
  if (!token) return null;

  const isPrime = token.endsWith("'");
  const baseMove = isPrime ? token.slice(0, -1) : token;
  const config = BASE_MOVE_CONFIGS[baseMove];

  if (!config) return null;
  if (config.requiredSizes && !config.requiredSizes.includes(size)) return null;
  if (config.requiresOddSize && size % 2 === 0) return null;

  return {
    ...config,
    direction: isPrime ? -config.direction : config.direction,
    layerValue: resolveLayerValue(size, config.layer),
  };
}

function rotateVector(vec: Vec3, axis: Axis, direction: number): Vec3 {
  const { x, y, z } = vec;
  if (axis === 'x') return direction > 0 ? { x, y: -z, z: y } : { x, y: z, z: -y };
  if (axis === 'y') return direction > 0 ? { x: z, y, z: -x } : { x: -z, y, z: x };
  return direction > 0 ? { x: -y, y: x, z } : { x: y, y: -x, z };
}

function shouldRotateSticker(sticker: StickerModel, config: ResolvedMoveConfig): boolean {
  if (config.layerValue === 'all') return true;
  return sticker[config.axis] === config.layerValue;
}

function rotateSticker(sticker: StickerModel, axis: Axis, direction: number): StickerModel {
  const position = rotateVector(sticker, axis, direction);
  const normal = rotateVector({ x: sticker.nx, y: sticker.ny, z: sticker.nz }, axis, direction);
  return { ...sticker, x: position.x, y: position.y, z: position.z, nx: normal.x, ny: normal.y, nz: normal.z };
}

function applySingleMove(cubeState: CubeState, move: string, size: number): CubeState {
  const config = parseSingleMove(move, size);
  if (!config) return cloneCubeState(cubeState);

  const stickers = createStickerModel(cubeState).map((sticker) =>
    shouldRotateSticker(sticker, config) ? rotateSticker(sticker, config.axis, config.direction) : sticker,
  );

  return stickersToState(stickers, size);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getSupportedMoves(size: number = 3): string[] {
  return getBaseMoveTokens(size).flatMap((move) => [move, `${move}'`, `${move}2`]);
}

export const MOVES: string[] = getSupportedMoves(3);

export function expandMoveToken(move: string): string[] {
  const token = move?.trim();
  if (!token) return [];

  const match = token.match(MOVE_TOKEN_PATTERN);
  if (!match) return [];

  const [, baseMove, modifier = ''] = match;
  if (modifier === '2') return [baseMove, baseMove];
  return [modifier === "'" ? `${baseMove}'` : baseMove];
}

export function normalizeMoveSequence(sequence: string[]): string[] {
  return sequence.flatMap(expandMoveToken);
}

export function isSupportedMove(move: string, size: number = 3): boolean {
  const normalizedMoves = expandMoveToken(move);
  if (normalizedMoves.length === 0) return false;
  const allowedMoves = new Set(getSupportedMoves(size));
  return normalizedMoves.every((token) => allowedMoves.has(token));
}

export function applyMove(cubeState: CubeState, move: string): CubeState {
  const size = normalizeCubeSize(getFaceSize(cubeState)!);
  const normalizedMoves = expandMoveToken(move);
  if (normalizedMoves.length === 0) return cloneCubeState(cubeState);
  return normalizedMoves.reduce((state, token) => applySingleMove(state, token, size), cloneCubeState(cubeState));
}

export function applyMoves(initialState: CubeState, moves: string[]): CubeState {
  const size = normalizeCubeSize(getFaceSize(initialState)!);
  const normalizedMoves = normalizeMoveSequence(moves);
  return normalizedMoves.reduce((state, token) => applySingleMove(state, token, size), cloneCubeState(initialState));
}
