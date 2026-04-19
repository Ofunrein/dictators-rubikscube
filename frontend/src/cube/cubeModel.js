/**
 * cubeModel.js — Shared cube state helpers for 2x2, 3x3, and 4x4 cubes
 *
 * This file is the common ground between the frontend simulator and the backend API.
 * It keeps the "what does a cube state look like?" rules in one place so the
 * renderer, move engine, validators, and API routes all agree.
 *
 * A cube state is still the same simple shape the project already uses:
 *   {
 *     U: [...stickers],
 *     R: [...stickers],
 *     F: [...stickers],
 *     D: [...stickers],
 *     L: [...stickers],
 *     B: [...stickers]
 *   }
 *
 * The only difference now is that each face can hold 4, 9, or 16 stickers
 * depending on whether the cube is 2x2, 3x3, or 4x4.
 *
 * This file also knows how to translate between a face sticker (face + row + col)
 * and a cubie's 3D coordinates. That translation is what lets the move engine
 * rotate any supported cube size without hardcoding one giant set of indices.
 */

import { isPlainObject } from '../utils/isPlainObject.js';

export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

export const FACE_COLORS = {
  U: 'W',
  R: 'R',
  F: 'G',
  D: 'Y',
  L: 'O',
  B: 'B',
};

export const STICKER_TOKENS = Object.values(FACE_COLORS);
export const SUPPORTED_CUBE_SIZES = [2, 3, 4];

const FACE_SET = new Set(FACE_ORDER);
const STICKER_SET = new Set(STICKER_TOKENS);

const FACE_NORMALS = {
  U: { nx: 0, ny: 1, nz: 0 },
  R: { nx: 1, ny: 0, nz: 0 },
  F: { nx: 0, ny: 0, nz: 1 },
  D: { nx: 0, ny: -1, nz: 0 },
  L: { nx: -1, ny: 0, nz: 0 },
  B: { nx: 0, ny: 0, nz: -1 },
};

const FACE_FROM_NORMAL = {
  '0,1,0': 'U',
  '1,0,0': 'R',
  '0,0,1': 'F',
  '0,-1,0': 'D',
  '-1,0,0': 'L',
  '0,0,-1': 'B',
};

function getSquareFaceSize(length) {
  const size = Math.sqrt(length);
  return Number.isInteger(size) ? size : null;
}

function getCoordKey(value) {
  return String(value);
}

function getCoordinateContext(size) {
  const coords = getCoordinateValues(size);
  return {
    coords,
    indexByCoord: new Map(coords.map((value, index) => [getCoordKey(value), index])),
    max: coords[coords.length - 1],
    min: coords[0],
  };
}

function getCoordIndex(indexByCoord, value, label) {
  const index = indexByCoord.get(getCoordKey(value));
  if (index === undefined) {
    throw new Error(`Unable to map ${label} coordinate ${value} back to a face index.`);
  }
  return index;
}

function getFaceFromNormal(nx, ny, nz) {
  const face = FACE_FROM_NORMAL[`${nx},${ny},${nz}`];
  if (!face) {
    throw new Error(`Unknown sticker normal: ${nx},${ny},${nz}`);
  }
  return face;
}

export function normalizeCubeSize(size = 3) {
  const numericSize = Number(size);
  if (!Number.isInteger(numericSize) || !SUPPORTED_CUBE_SIZES.includes(numericSize)) {
    throw new Error(`Cube size must be one of ${SUPPORTED_CUBE_SIZES.join(', ')}.`);
  }
  return numericSize;
}

// Generates the list of coordinate values used to place cubies along each axis.
// For a 3x3, cubies sit at -1, 0, 1. For a 2x2, they sit at -0.5, 0.5.
// For a 4x4, they sit at -1.5, -0.5, 0.5, 1.5.
// The trick: subtract the offset so the cube is centered at the origin (0,0,0).
export function getCoordinateValues(size) {
  const normalizedSize = normalizeCubeSize(size);
  const offset = (normalizedSize - 1) / 2;
  return Array.from({ length: normalizedSize }, (_, index) => index - offset);
}

export function getFaceSize(state) {
  if (!isPlainObject(state)) {
    return null;
  }

  let detectedSize = null;

  for (const face of FACE_ORDER) {
    const stickers = state[face];
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

export function createSolvedState(size = 3) {
  const normalizedSize = normalizeCubeSize(size);
  const stickerCount = normalizedSize * normalizedSize;

  return FACE_ORDER.reduce((acc, face) => {
    acc[face] = Array(stickerCount).fill(FACE_COLORS[face]);
    return acc;
  }, {});
}

export function cloneCubeState(state) {
  return FACE_ORDER.reduce((acc, face) => {
    acc[face] = [...state[face]];
    return acc;
  }, {});
}

export function collectCubeStateDetails(candidate, expectedSize, path = 'state') {
  const details = [];
  const normalizedExpectedSize = expectedSize === undefined ? undefined : Number(expectedSize);

  if (!isPlainObject(candidate)) {
    details.push({
      path,
      message: 'Cube state must be an object with U, R, F, D, L, B faces.',
    });
    return details;
  }

  const unknownFaces = Object.keys(candidate).filter((key) => !FACE_SET.has(key));
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
    const stickers = candidate[face];

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
      if (!STICKER_SET.has(stickers[index])) {
        details.push({
          path: `${path}.${face}[${index}]`,
          message: 'Sticker must be one of W, R, G, Y, O, B.',
        });
      }
    }
  }

  return details;
}

export function validateCubeState(candidate, expectedSize) {
  const details = collectCubeStateDetails(candidate, expectedSize);
  if (details.length > 0) {
    throw new Error(details[0].message);
  }
  return cloneCubeState(candidate);
}

// Converts a face sticker at (face, row, col) into 3D coordinates (x, y, z)
// plus a surface normal vector (nx, ny, nz) that says which direction the
// sticker faces.
//
// Why this is complex:
//   Each face of the cube maps row/col to different 3D axes. For example,
//   the Front face maps col → x and row → y, while the Up face maps
//   col → x and row → z (because "up" looks down the Y axis).
//
//   yFromRow flips the row so row 0 is at the TOP of the face visually
//   (matching the sticker array's layout where index 0 is top-left).
export function getStickerAddress(face, row, col, size) {
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

  const yFromRow = coords[normalizedSize - 1 - row];

  switch (face) {
    case 'F':
      return { face, row, col, x: coords[col], y: yFromRow, z: max, ...FACE_NORMALS.F };
    case 'B':
      return { face, row, col, x: coords[normalizedSize - 1 - col], y: yFromRow, z: min, ...FACE_NORMALS.B };
    case 'U':
      return { face, row, col, x: coords[col], y: max, z: coords[normalizedSize - 1 - row], ...FACE_NORMALS.U };
    case 'D':
      return { face, row, col, x: coords[col], y: min, z: coords[row], ...FACE_NORMALS.D };
    case 'R':
      return { face, row, col, x: max, y: yFromRow, z: coords[normalizedSize - 1 - col], ...FACE_NORMALS.R };
    case 'L':
      return { face, row, col, x: min, y: yFromRow, z: coords[col], ...FACE_NORMALS.L };
    default:
      throw new Error(`Unhandled face: ${face}`);
  }
}

// The reverse of getStickerAddress: given a face name and 3D coordinates,
// figure out which row and column of the face array this sticker belongs to.
// Used after a move rotates stickers to new 3D positions — we need to know
// which slot in the flat face array each sticker should land in.
export function getFaceRowColFromAddress(face, x, y, z, size) {
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

export function getFaceIndexFromAddress(face, x, y, z, size) {
  const { row, col } = getFaceRowColFromAddress(face, x, y, z, size);
  return row * normalizeCubeSize(size) + col;
}

// Builds the full 3D sticker model from a flat cube state.
// For every face → every row → every column, it creates a sticker object
// with 3D coordinates (x,y,z), a normal vector (nx,ny,nz), and the color token.
// This is the bridge between the simple face-array state and the 3D world.
// The move engine uses this to rotate stickers in 3D space and then
// convert back to the flat state with stickersToState().
export function createStickerModel(state) {
  const size = normalizeCubeSize(getFaceSize(state));
  validateCubeState(state, size);

  const stickers = [];

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

// Converts rotated 3D stickers back into the flat face-array state.
// After a move, stickers have new positions and normals. The normal tells
// us which face the sticker now belongs to, and the position tells us which
// row/col slot it lands in. If any face has unfilled slots after reconstruction,
// something went wrong with the rotation math, so we throw an error.
export function stickersToState(stickers, size) {
  const normalizedSize = normalizeCubeSize(size);
  const state = FACE_ORDER.reduce((acc, face) => {
    acc[face] = Array(normalizedSize * normalizedSize).fill(null);
    return acc;
  }, {});

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

  return state;
}

// Generates the 3D grid of cubie positions for the InteractiveCube renderer.
// A 3x3 produces 27 cubies (including the invisible center one).
// Each cubie gets a position array [x, y, z] and a unique key string.
export function buildCubieLayout(size) {
  const normalizedSize = normalizeCubeSize(size);
  const coords = getCoordinateValues(normalizedSize);
  const cubies = [];

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
