/**
 * simulatorFaceMapUtils.ts — Helpers for the 2D face map display
 */

export function getFaceDimension(face: unknown[] = [], fallbackSize: number = 3): number {
  const stickerCount = Array.isArray(face) && face.length > 0 ? face.length : fallbackSize * fallbackSize;
  const inferredDimension = Math.round(Math.sqrt(stickerCount));
  return inferredDimension > 0 && inferredDimension * inferredDimension === stickerCount
    ? inferredDimension
    : fallbackSize;
}

export function normalizeFaceStickers(face: unknown[] = [], fallbackSize: number = 3): string[] {
  const faceDimension = getFaceDimension(face, fallbackSize);
  return Array.from({ length: faceDimension * faceDimension }, (_, index) => (face?.[index] as string | undefined) ?? 'W');
}

export function orientFaceForMap(stickers: string[], faceName: string, size: number): string[] {
  if (faceName !== 'U' && faceName !== 'D') {
    return stickers;
  }

  const result: string[] = [];
  for (let row = size - 1; row >= 0; row -= 1) {
    const start = row * size;
    for (let col = 0; col < size; col += 1) {
      result.push(stickers[start + col]);
    }
  }
  return result;
}
