/**
 * SimulatorFaceMap.test.js — Tests for the 2D face map display helpers
 *
 * The face map shows a flat grid of colored squares for each cube face.
 * These tests make sure the helper functions that prepare sticker data
 * for the face map work correctly — that sticker order is preserved
 * (not accidentally mirrored) and that different cube sizes (3x3, 4x4)
 * are handled properly.
 *
 * Run with: npx vitest run (from frontend/)
 */
import { describe, expect, it } from 'vitest';
import { getFaceDimension, normalizeFaceStickers } from './simulatorFaceMapUtils';

describe('SimulatorFaceMap helpers', () => {
  it('keeps sticker order unchanged instead of mirroring face rows', () => {
    const face = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    expect(normalizeFaceStickers(face, 3)).toEqual(face);
  });

  it('preserves 4x4 sticker order and size-aware fallback behavior', () => {
    const fourByFourFace = Array.from({ length: 16 }, (_, index) => String(index + 1));
    expect(getFaceDimension(fourByFourFace, 4)).toBe(4);
    expect(normalizeFaceStickers(fourByFourFace, 4)).toEqual(fourByFourFace);
    expect(normalizeFaceStickers(undefined, 4)).toEqual(Array(16).fill('W'));
  });
});
