/**
 * cubeModel.ts — Shared cube state helpers for 2x2, 3x3, and 4x4 cubes
 */

import { isPlainObject } from '../utils/isPlainObject.js';

export type FaceName = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export type StickerToken = 'W' | 'R' | 'G' | 'Y' | 'O' | 'B';

export interface CubeStateObj {
  U: StickerToken[];
  R: StickerToken[];
  F: StickerToken[];
  D: StickerToken[];
  L: StickerToken[];
  B: StickerToken[];
}

export interface StickerAddress {
  face: FaceName;
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

export interface CubieLayout {
  key: string;
  x: number;
  y: number;
  z: number;
  position: [number, number, number];
}

interface ValidationDetail {
  path: string;
  message: string;
}

// URFDLB is the WCA (World Cube Association) standard — solvers and move notation all expect this order.
export const FACE_ORDER: FaceName[] = ['U', 'R', 'F', 'D', 'L', 'B'];

export const FACE_COLORS: Record<FaceName, StickerToken> = {
  U: 'W',
  R: 'R',
  F: 'G',
  D: 'Y',
  L: 'O',
  B: 'B',
};

export const STICKER_TOKENS = Object.values(FACE_COLORS) as StickerToken[];
export const SUPPORTED_CUBE_SIZES = [2, 3, 4];

const FACE_SET = new Set<string>(FACE_ORDER);
const STICKER_SET = new Set<string>(STICKER_TOKENS);

interface FaceNormal {
  nx: number;
  ny: number;
  nz: number;
}

// Each face normal is a unit vector pointing outward; used to map a 3-D sticker position back to a face name.
const FACE_NORMALS: Record<FaceName, FaceNormal> = {
  U: { nx: 0, ny: 1, nz: 0 },
  R: { nx: 1, ny: 0, nz: 0 },
  F: { nx: 0, ny: 0, nz: 1 },
  D: { nx: 0, ny: -1, nz: 0 },
  L: { nx: -1, ny: 0, nz: 0 },
  B: { nx: 0, ny: 0, nz: -1 },
};

// Stringify the normal tuple so it can be used as an object key for O(1) reverse-lookup.
const FACE_FROM_NORMAL: Record<string, FaceName> = {
  '0,1,0': 'U',
  '1,0,0': 'R',
  '0,0,1': 'F',
  '0,-1,0': 'D',
  '-1,0,0': 'L',
  '0,0,-1': 'B',
};

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

function getCoordinateContext(size: number): CoordinateContext {
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

function getFaceFromNormal(nx: number, ny: number, nz: number): FaceName {
  const face = FACE_FROM_NORMAL[`${nx},${ny},${nz}`];
  if (!face) {
    throw new Error(`Unknown sticker normal: ${nx},${ny},${nz}`);
  }
  return face;
}

export function normalizeCubeSize(size: number | null | undefined = 3): number {
  const numericSize = Number(size);
  if (!Number.isInteger(numericSize) || !SUPPORTED_CUBE_SIZES.includes(numericSize)) {
    throw new Error(`Cube size must be one of ${SUPPORTED_CUBE_SIZES.join(', ')}.`);
  }
  return numericSize;
}

export function getCoordinateValues(size: number): number[] {
  const normalizedSize = normalizeCubeSize(size);
  // Centering at 0 keeps rotation math symmetric: rotating 90° is just swapping/negating axes.
  const offset = (normalizedSize - 1) / 2;
  return Array.from({ length: normalizedSize }, (_, index) => index - offset);
}

export function getFaceSize(state: unknown): number | null {
  if (!isPlainObject(state)) {
    return null;
  }

  let detectedSize: number | null = null;

  for (const face of FACE_ORDER) {
    const stickers = (state as Record<string, unknown>)[face];
    if (!Array.isArray(stickers)) {
      return null;
    }

    const faceSize = getSquareFaceSize(stickers.length);
    if (!faceSize) {
      return null;
    }

    if (detectedSize === null) {
      detectedSize = faceSize;
      continue;
    }

    if (detectedSize !== faceSize) {
      return null;
    }
  }

  return detectedSize;
}

export function createSolvedState(size: number = 3): CubeStateObj {
  const normalizedSize = normalizeCubeSize(size);
  const stickerCount = normalizedSize * normalizedSize;

  // Flat array per face — no 2-D grid — so any sticker is O(1) by index = row*size+col.
  return FACE_ORDER.reduce((acc, face) => {
    acc[face] = Array(stickerCount).fill(FACE_COLORS[face]);
    return acc;
  }, {} as CubeStateObj);
}

export function cloneCubeState(state: CubeStateObj): CubeStateObj {
  return FACE_ORDER.reduce((acc, face) => {
    acc[face] = [...state[face]];
    return acc;
  }, {} as CubeStateObj);
}

export function collectCubeStateDetails(
  candidate: unknown,
  expectedSize?: number,
  path: string = 'state',
): ValidationDetail[] {
  const details: ValidationDetail[] = [];
  const normalizedExpectedSize = expectedSize === undefined ? undefined : Number(expectedSize);

  if (!isPlainObject(candidate)) {
    details.push({
      path,
      message: 'Cube state must be an object with U, R, F, D, L, B faces.',
    });
    return details;
  }

  const candidateRecord = candidate as Record<string, unknown>;
  // Unknown face keys are reported separately so the caller gets a complete error list, not just the first.
  const unknownFaces = Object.keys(candidateRecord).filter((key) => !FACE_SET.has(key));
  for (const face of unknownFaces) {
    details.push({ path: `${path}.${face}`, message: 'Unknown face key.' });
  }

  const detectedSize = getFaceSize(candidate);
  if (detectedSize !== null && !SUPPORTED_CUBE_SIZES.includes(detectedSize)) {
    details.push({
      path,
      message: `Cube size must be one of ${SUPPORTED_CUBE_SIZES.join(', ')}.`,
    });
  }

  if (
    detectedSize !== null &&
    normalizedExpectedSize !== undefined &&
    detectedSize !== normalizedExpectedSize
  ) {
    details.push({
      path,
      message: `Cube state size (${detectedSize}) does not match requested size (${normalizedExpectedSize}).`,
    });
  }

  const expectedStickerCount =
    normalizedExpectedSize !== undefined ? normalizedExpectedSize * normalizedExpectedSize : null;

  for (const face of FACE_ORDER) {
    const stickers = candidateRecord[face];

    if (!Array.isArray(stickers)) {
      details.push({
        path: `${path}.${face}`,
        message: 'Face must be an array of stickers.',
      });
      continue;
    }

    if (expectedStickerCount !== null && stickers.length !== expectedStickerCount) {
      details.push({
        path: `${path}.${face}`,
        message: `Face must contain exactly ${expectedStickerCount} stickers.`,
      });
      continue;
    }

    // Square root must be a whole number; non-integer means the sticker count can't form a square face.
    const faceSize = getSquareFaceSize(stickers.length);
    if (!faceSize) {
      details.push({
        path: `${path}.${face}`,
        message: 'Face length must describe a square grid.',
      });
      continue;
    }

    if (!SUPPORTED_CUBE_SIZES.includes(faceSize)) {
      details.push({
        path: `${path}.${face}`,
        message: `Face size must be one of ${SUPPORTED_CUBE_SIZES.join(', ')}.`,
      });
      continue;
    }

    for (let index = 0; index < stickers.length; index += 1) {
      if (!STICKER_SET.has(stickers[index] as string)) {
        details.push({
          path: `${path}.${face}[${index}]`,
          message: 'Sticker must be one of W, R, G, Y, O, B.',
        });
      }
    }
  }

  return details;
}

export function validateCubeState(candidate: unknown, expectedSize?: number): CubeStateObj {
  const details = collectCubeStateDetails(candidate, expectedSize);
  if (details.length > 0) {
    throw new Error(details[0].message);
  }
  return cloneCubeState(candidate as CubeStateObj);
}

export function getStickerAddress(face: string, row: number, col: number, size: number): StickerAddress {
  const normalizedSize = normalizeCubeSize(size);
  const { coords, max, min } = getCoordinateContext(normalizedSize);

  if (!FACE_SET.has(face)) {
    throw new Error(`Unknown face: ${face}`);
  }

  if (
    !Number.isInteger(row) ||
    !Number.isInteger(col) ||
    row < 0 ||
    col < 0 ||
    row >= normalizedSize ||
    col >= normalizedSize
  ) {
    throw new Error(`Sticker row/col must be inside a ${normalizedSize}x${normalizedSize} face.`);
  }

  // Row 0 is the top of the face in 2-D, but +y is up in 3-D, so invert: row 0 → max y coord.
  const yFromRow = coords[normalizedSize - 1 - row];
  const faceName = face as FaceName;

  switch (faceName) {
    // F faces the viewer (+z). x increases left→right (col), y increases bottom→top (inverted row).
    case 'F':
      return { face: faceName, row, col, x: coords[col], y: yFromRow, z: max, ...FACE_NORMALS.F };
    // B faces away (−z). x is mirrored so the face reads correctly when viewed from the back.
    case 'B':
      return { face: faceName, row, col, x: coords[normalizedSize - 1 - col], y: yFromRow, z: min, ...FACE_NORMALS.B };
    // U is the top face (+y). The "row" axis maps to −z so row 0 is the back edge (far from viewer).
    case 'U':
      return { face: faceName, row, col, x: coords[col], y: max, z: coords[normalizedSize - 1 - row], ...FACE_NORMALS.U };
    // D is the bottom face (−y). Row 0 is the front edge, so z maps directly without inversion.
    case 'D':
      return { face: faceName, row, col, x: coords[col], y: min, z: coords[row], ...FACE_NORMALS.D };
    // R face (+x). z decreases as col increases so the face reads left→right when viewed from the right.
    case 'R':
      return { face: faceName, row, col, x: max, y: yFromRow, z: coords[normalizedSize - 1 - col], ...FACE_NORMALS.R };
    // L face (−x). z increases with col — mirror of R — so the face reads correctly from the left.
    case 'L':
      return { face: faceName, row, col, x: min, y: yFromRow, z: coords[col], ...FACE_NORMALS.L };
    default:
      throw new Error(`Unhandled face: ${face}`);
  }
}

export function getFaceRowColFromAddress(
  face: string,
  x: number,
  y: number,
  z: number,
  size: number,
): { row: number; col: number } {
  const normalizedSize = normalizeCubeSize(size);
  const { indexByCoord } = getCoordinateContext(normalizedSize);

  switch (face) {
    case 'F':
      return {
        row: normalizedSize - 1 - getCoordIndex(indexByCoord, y, 'F.y'),
        col: getCoordIndex(indexByCoord, x, 'F.x'),
      };
    case 'B':
      return {
        row: normalizedSize - 1 - getCoordIndex(indexByCoord, y, 'B.y'),
        col: normalizedSize - 1 - getCoordIndex(indexByCoord, x, 'B.x'),
      };
    case 'U':
      return {
        row: normalizedSize - 1 - getCoordIndex(indexByCoord, z, 'U.z'),
        col: getCoordIndex(indexByCoord, x, 'U.x'),
      };
    case 'D':
      return {
        row: getCoordIndex(indexByCoord, z, 'D.z'),
        col: getCoordIndex(indexByCoord, x, 'D.x'),
      };
    case 'R':
      return {
        row: normalizedSize - 1 - getCoordIndex(indexByCoord, y, 'R.y'),
        col: normalizedSize - 1 - getCoordIndex(indexByCoord, z, 'R.z'),
      };
    case 'L':
      return {
        row: normalizedSize - 1 - getCoordIndex(indexByCoord, y, 'L.y'),
        col: getCoordIndex(indexByCoord, z, 'L.z'),
      };
    default:
      throw new Error(`Unknown face: ${face}`);
  }
}

export function getFaceIndexFromAddress(face: string, x: number, y: number, z: number, size: number): number {
  const { row, col } = getFaceRowColFromAddress(face, x, y, z, size);
  // Flatten 2-D (row, col) to 1-D index; matches how createSolvedState lays out the flat array.
  return row * normalizeCubeSize(size) + col;
}

export function createStickerModel(state: CubeStateObj): StickerModel[] {
  const size = normalizeCubeSize(getFaceSize(state));
  validateCubeState(state, size);

  const stickers: StickerModel[] = [];

  for (const face of FACE_ORDER) {
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const index = row * size + col;
        stickers.push({
          ...getStickerAddress(face, row, col, size),
          color: state[face][index],
        });
      }
    }
  }

  return stickers;
}

export function stickersToState(stickers: StickerModel[], size: number): CubeStateObj {
  const normalizedSize = normalizeCubeSize(size);
  const state = FACE_ORDER.reduce((acc, face) => {
    acc[face] = Array(normalizedSize * normalizedSize).fill(null) as StickerToken[];
    return acc;
  }, {} as CubeStateObj);

  for (const sticker of stickers) {
    const face = getFaceFromNormal(sticker.nx, sticker.ny, sticker.nz);
    const index = getFaceIndexFromAddress(face, sticker.x, sticker.y, sticker.z, normalizedSize);
    state[face][index] = sticker.color;
  }

  for (const face of FACE_ORDER) {
    // Null gap means a sticker address mapped to a slot that no input sticker covered — broken input.
    if (state[face].some((token) => token === null)) {
      throw new Error(`Sticker reconstruction left gaps on the ${face} face.`);
    }
  }

  return state;
}

export function buildCubieLayout(size: number): CubieLayout[] {
  const normalizedSize = normalizeCubeSize(size);
  const coords = getCoordinateValues(normalizedSize);
  const cubies: CubieLayout[] = [];

  // Triple loop over all (x,y,z) positions — includes interior cubies, but the renderer
  // only attaches stickers to outer faces so interior slots are naturally invisible.
  for (const x of coords) {
    for (const y of coords) {
      for (const z of coords) {
        cubies.push({
          key: `${x}-${y}-${z}`,
          x,
          y,
          z,
          position: [x, y, z],
        });
      }
    }
  }

  return cubies;
}
