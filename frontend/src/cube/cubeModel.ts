/**
 * cubeModel.ts — Shared cube state helpers for 2x2, 3x3, and 4x4 cubes
 *
 * This file is the common ground between the frontend simulator and the backend API.
 * It keeps the "what does a cube state look like?" rules in one place so the
 * renderer, move engine, validators, and API routes all agree.
 *
 * A cube state is a simple shape:
 *   {
 *     U: [...stickers],
 *     R: [...stickers],
 *     F: [...stickers],
 *     D: [...stickers],
 *     L: [...stickers],
 *     B: [...stickers]
 *   }
 *
 * Each face holds 4, 9, or 16 stickers depending on cube size (2x2, 3x3, 4x4).
 *
 * This file also translates between a face sticker (face + row + col)
 * and a cubie's 3D coordinates, letting the move engine rotate any
 * supported cube size without hardcoding one giant set of indices.
 */

import { isPlainObject } from '../utils/isPlainObject.js';

// ─── Core types ───────────────────────────────────────────────────────────────

export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export type StickerToken = 'W' | 'R' | 'G' | 'Y' | 'O' | 'B';
export type CubeSize = 2 | 3 | 4;
export type CubeState = Record<Face, StickerToken[]>;

export interface StickerAddress {
  face: Face;
  row: number;
  col: number;
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
}

export interface StickerModel extends StickerAddress {
  color: StickerToken;
}

export interface Cubie {
  key: string;
  x: number;
  y: number;
  z: number;
  position: [number, number, number];
}

export interface FaceNormal {
  nx: number;
  ny: number;
  nz: number;
}

export interface ValidationDetail {
  path: string;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const FACE_ORDER: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];

export const FACE_COLORS: Record<Face, StickerToken> = {
  U: 'W',
  R: 'R',
  F: 'G',
  D: 'Y',
  L: 'O',
  B: 'B',
};

export const STICKER_TOKENS: StickerToken[] = Object.values(FACE_COLORS) as StickerToken[];
export const SUPPORTED_CUBE_SIZES: CubeSize[] = [2, 3, 4];

const FACE_SET = new Set<string>(FACE_ORDER);
const STICKER_SET = new Set<string>(STICKER_TOKENS);

const FACE_NORMALS: Record<Face, FaceNormal> = {
  U: { nx: 0, ny: 1, nz: 0 },
  R: { nx: 1, ny: 0, nz: 0 },
  F: { nx: 0, ny: 0, nz: 1 },
  D: { nx: 0, ny: -1, nz: 0 },
  L: { nx: -1, ny: 0, nz: 0 },
  B: { nx: 0, ny: 0, nz: -1 },
};

const FACE_FROM_NORMAL: Record<string, Face> = {
  '0,1,0': 'U',
  '1,0,0': 'R',
  '0,0,1': 'F',
  '0,-1,0': 'D',
  '-1,0,0': 'L',
  '0,0,-1': 'B',
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getSquareFaceSize(length: number): number | null {
  const size = Math.sqrt(length);
  return Number.isInteger(size) ? size : null;
}

function getCoordKey(value: number): string {
  return String(value);
}

interface CoordinateContext {
  coords: number[];
  indexByCoord: Map<string, number>;
  max: number;
  min: number;
}

function getCoordinateContext(size: CubeSize): CoordinateContext {
  const coords = getCoordinateValues(size);
  return {
    coords,
    indexByCoord: new Map(coords.map((value, index) => [getCoordKey(value), index])),
    max: coords[coords.length - 1],
    min: coords[0],
  };
}

function getCoordIndex(indexByCoord: Map<string, number>, value: number, label: string): number {
  const index = indexByCoord.get(getCoordKey(value));
  if (index === undefined) {
    throw new Error(`Unable to map ${label} coordinate ${value} back to a face index.`);
  }
  return index;
}

function getFaceFromNormal(nx: number, ny: number, nz: number): Face {
  const face = FACE_FROM_NORMAL[`${nx},${ny},${nz}`];
  if (!face) {
    throw new Error(`Unknown sticker normal: ${nx},${ny},${nz}`);
  }
  return face;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function normalizeCubeSize(size: number | string = 3): CubeSize {
  const numericSize = Number(size);
  if (!Number.isInteger(numericSize) || !(SUPPORTED_CUBE_SIZES as number[]).includes(numericSize)) {
    throw new Error(`Cube size must be one of ${SUPPORTED_CUBE_SIZES.join(', ')}.`);
  }
  return numericSize as CubeSize;
}

export function getCoordinateValues(size: number): number[] {
  const normalizedSize = normalizeCubeSize(size);
  const offset = (normalizedSize - 1) / 2;
  return Array.from({ length: normalizedSize }, (_, index) => index - offset);
}

export function getFaceSize(state: unknown): CubeSize | null {
  if (!isPlainObject(state)) return null;

  let detectedSize: number | null = null;

  for (const face of FACE_ORDER) {
    const stickers = (state as Record<string, unknown>)[face];
    if (!Array.isArray(stickers)) return null;

    const faceSize = getSquareFaceSize(stickers.length);
    if (!faceSize) return null;

    if (detectedSize === null) {
      detectedSize = faceSize;
      continue;
    }

    if (detectedSize !== faceSize) return null;
  }

  if (detectedSize === null) return null;
  if (!(SUPPORTED_CUBE_SIZES as number[]).includes(detectedSize)) return null;
  return detectedSize as CubeSize;
}

export function createSolvedState(size: number = 3): CubeState {
  const normalizedSize = normalizeCubeSize(size);
  const stickerCount = normalizedSize * normalizedSize;

  return FACE_ORDER.reduce((acc, face) => {
    acc[face] = Array(stickerCount).fill(FACE_COLORS[face]);
    return acc;
  }, {} as CubeState);
}

export function cloneCubeState(state: CubeState): CubeState {
  return FACE_ORDER.reduce((acc, face) => {
    acc[face] = [...state[face]];
    return acc;
  }, {} as CubeState);
}

export function collectCubeStateDetails(
  candidate: unknown,
  expectedSize?: number,
  path = 'state',
): ValidationDetail[] {
  const details: ValidationDetail[] = [];
  const normalizedExpectedSize = expectedSize === undefined ? undefined : Number(expectedSize);

  if (!isPlainObject(candidate)) {
    details.push({ path, message: 'Cube state must be an object with U, R, F, D, L, B faces.' });
    return details;
  }

  const obj = candidate as Record<string, unknown>;

  const unknownFaces = Object.keys(obj).filter((key) => !FACE_SET.has(key));
  for (const face of unknownFaces) {
    details.push({ path: `${path}.${face}`, message: 'Unknown face key.' });
  }

  const detectedSize = getFaceSize(candidate);
  if (detectedSize !== null && !(SUPPORTED_CUBE_SIZES as number[]).includes(detectedSize)) {
    details.push({ path, message: `Cube size must be one of ${SUPPORTED_CUBE_SIZES.join(', ')}.` });
  }

  if (detectedSize !== null && normalizedExpectedSize !== undefined && detectedSize !== normalizedExpectedSize) {
    details.push({
      path,
      message: `Cube state size (${detectedSize}) does not match requested size (${normalizedExpectedSize}).`,
    });
  }

  const expectedStickerCount = normalizedExpectedSize !== undefined ? normalizedExpectedSize * normalizedExpectedSize : null;

  for (const face of FACE_ORDER) {
    const stickers = obj[face];

    if (!Array.isArray(stickers)) {
      details.push({ path: `${path}.${face}`, message: 'Face must be an array of stickers.' });
      continue;
    }

    if (expectedStickerCount !== null && stickers.length !== expectedStickerCount) {
      details.push({ path: `${path}.${face}`, message: `Face must contain exactly ${expectedStickerCount} stickers.` });
      continue;
    }

    const faceSize = getSquareFaceSize(stickers.length);
    if (!faceSize) {
      details.push({ path: `${path}.${face}`, message: 'Face length must describe a square grid.' });
      continue;
    }

    if (!(SUPPORTED_CUBE_SIZES as number[]).includes(faceSize)) {
      details.push({ path: `${path}.${face}`, message: `Face size must be one of ${SUPPORTED_CUBE_SIZES.join(', ')}.` });
      continue;
    }

    for (let index = 0; index < stickers.length; index++) {
      if (!STICKER_SET.has(stickers[index] as string)) {
        details.push({ path: `${path}.${face}[${index}]`, message: 'Sticker must be one of W, R, G, Y, O, B.' });
      }
    }
  }

  return details;
}

export function validateCubeState(candidate: unknown, expectedSize?: number): CubeState {
  const details = collectCubeStateDetails(candidate, expectedSize);
  if (details.length > 0) throw new Error(details[0].message);
  return cloneCubeState(candidate as CubeState);
}

export function getStickerAddress(face: Face, row: number, col: number, size: number): StickerAddress {
  const normalizedSize = normalizeCubeSize(size);
  const { coords, max, min } = getCoordinateContext(normalizedSize);

  if (!FACE_SET.has(face)) throw new Error(`Unknown face: ${face}`);

  if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || col < 0 || row >= normalizedSize || col >= normalizedSize) {
    throw new Error(`Sticker row/col must be inside a ${normalizedSize}x${normalizedSize} face.`);
  }

  const yFromRow = coords[normalizedSize - 1 - row];

  switch (face) {
    case 'F': return { face, row, col, x: coords[col], y: yFromRow, z: max, ...FACE_NORMALS.F };
    case 'B': return { face, row, col, x: coords[normalizedSize - 1 - col], y: yFromRow, z: min, ...FACE_NORMALS.B };
    case 'U': return { face, row, col, x: coords[col], y: max, z: coords[normalizedSize - 1 - row], ...FACE_NORMALS.U };
    case 'D': return { face, row, col, x: coords[col], y: min, z: coords[row], ...FACE_NORMALS.D };
    case 'R': return { face, row, col, x: max, y: yFromRow, z: coords[normalizedSize - 1 - col], ...FACE_NORMALS.R };
    case 'L': return { face, row, col, x: min, y: yFromRow, z: coords[col], ...FACE_NORMALS.L };
  }
}

export function getFaceRowColFromAddress(face: Face, x: number, y: number, z: number, size: number): { row: number; col: number } {
  const normalizedSize = normalizeCubeSize(size);
  const { indexByCoord } = getCoordinateContext(normalizedSize);

  switch (face) {
    case 'F': return { row: normalizedSize - 1 - getCoordIndex(indexByCoord, y, 'F.y'), col: getCoordIndex(indexByCoord, x, 'F.x') };
    case 'B': return { row: normalizedSize - 1 - getCoordIndex(indexByCoord, y, 'B.y'), col: normalizedSize - 1 - getCoordIndex(indexByCoord, x, 'B.x') };
    case 'U': return { row: normalizedSize - 1 - getCoordIndex(indexByCoord, z, 'U.z'), col: getCoordIndex(indexByCoord, x, 'U.x') };
    case 'D': return { row: getCoordIndex(indexByCoord, z, 'D.z'), col: getCoordIndex(indexByCoord, x, 'D.x') };
    case 'R': return { row: normalizedSize - 1 - getCoordIndex(indexByCoord, y, 'R.y'), col: normalizedSize - 1 - getCoordIndex(indexByCoord, z, 'R.z') };
    case 'L': return { row: normalizedSize - 1 - getCoordIndex(indexByCoord, y, 'L.y'), col: getCoordIndex(indexByCoord, z, 'L.z') };
  }
}

export function getFaceIndexFromAddress(face: Face, x: number, y: number, z: number, size: number): number {
  const { row, col } = getFaceRowColFromAddress(face, x, y, z, size);
  return row * normalizeCubeSize(size) + col;
}

export function createStickerModel(state: CubeState): StickerModel[] {
  const size = normalizeCubeSize(getFaceSize(state)!);
  validateCubeState(state, size);

  const stickers: StickerModel[] = [];

  for (const face of FACE_ORDER) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const index = row * size + col;
        stickers.push({ ...getStickerAddress(face, row, col, size), color: state[face][index] });
      }
    }
  }

  return stickers;
}

export function stickersToState(stickers: StickerModel[], size: number): CubeState {
  const normalizedSize = normalizeCubeSize(size);
  const state = FACE_ORDER.reduce((acc, face) => {
    acc[face] = Array(normalizedSize * normalizedSize).fill(null);
    return acc;
  }, {} as Record<Face, (StickerToken | null)[]>);

  for (const sticker of stickers) {
    const face = getFaceFromNormal(sticker.nx, sticker.ny, sticker.nz);
    const index = getFaceIndexFromAddress(face, sticker.x, sticker.y, sticker.z, normalizedSize);
    state[face][index] = sticker.color;
  }

  for (const face of FACE_ORDER) {
    if (state[face].some((token) => token === null)) {
      throw new Error(`Sticker reconstruction left gaps on the ${face} face.`);
    }
  }

  return state as CubeState;
}

export function buildCubieLayout(size: number): Cubie[] {
  const normalizedSize = normalizeCubeSize(size);
  const coords = getCoordinateValues(normalizedSize);
  const cubies: Cubie[] = [];

  for (const x of coords) {
    for (const y of coords) {
      for (const z of coords) {
        cubies.push({ key: `${x}-${y}-${z}`, x, y, z, position: [x, y, z] });
      }
    }
  }

  return cubies;
}
