/**
 * simulatorFaceMapUtils.js — Helpers for the 2D face map display
 *
 * The face map (SimulatorFaceMap.jsx) shows a flattened grid of colored squares
 * for each cube face. These helpers make sure the face arrays are always the
 * right length and shape, even if something weird comes in from state.
 *
 * Why this exists as a separate file:
 *   The face map rendering was getting cluttered with defensive checks.
 *   Pulling the normalization logic out keeps SimulatorFaceMap clean and
 *   makes it easier to test these helpers independently.
 *
 * Exports:
 *   getFaceDimension(face, fallbackSize) → the NxN dimension of a face array
 *   normalizeFaceStickers(face, fallbackSize) → a guaranteed-correct-length array
 */

// Given a face's sticker array, figure out the dimension (2, 3, or 4).
// A 3x3 face has 9 stickers, sqrt(9) = 3. If the array is empty or
// has a non-square length, fall back to the default size.
export function getFaceDimension(face = [], fallbackSize = 3) {
  const stickerCount = Array.isArray(face) && face.length > 0 ? face.length : fallbackSize * fallbackSize;
  const inferredDimension = Math.round(Math.sqrt(stickerCount));
  return inferredDimension > 0 && inferredDimension * inferredDimension === stickerCount
    ? inferredDimension
    : fallbackSize;
}

// Returns a sticker array that's guaranteed to be exactly NxN long.
// If the real face data is shorter (shouldn't happen normally), the
// missing slots get filled with 'W' (white) as a safe visual default.
export function normalizeFaceStickers(face = [], fallbackSize = 3) {
  const faceDimension = getFaceDimension(face, fallbackSize);
  return Array.from({ length: faceDimension * faceDimension }, (_, index) => face?.[index] ?? 'W');
}

// Reverses the row order of a face's sticker array so the 2D face map
// matches the 3D cube's orientation.
//
// Why U and D need flipping:
//   In cubeModel.js, U face row 0 maps to z=max (the FRONT edge, closest to F).
//   But in the 2D face map, row 0 renders at the TOP of the grid.
//   That puts the front edge at the top — which is backwards.
//   Flipping the rows puts the front edge at the bottom where it belongs.
//   D has the same issue in reverse (row 0 = back edge, should be at bottom).
export function orientFaceForMap(stickers, faceName, size) {
  if (faceName !== 'U' && faceName !== 'D') {
    return stickers;
  }

  const result = [];
  for (let row = size - 1; row >= 0; row -= 1) {
    const start = row * size;
    for (let col = 0; col < size; col += 1) {
      result.push(stickers[start + col]);
    }
  }
  return result;
}
