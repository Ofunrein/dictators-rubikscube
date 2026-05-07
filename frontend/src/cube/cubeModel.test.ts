import { describe, expect, it } from 'vitest';
import { createSolvedState } from './cubeModel.ts';

describe('cubeModel', () => {
  it('createSolvedState returns 6 faces for 3x3', () => {
    const state = createSolvedState(3);
    expect(Object.keys(state).length).toBe(6);
  });

  it('each face has 9 stickers for 3x3', () => {
    const state = createSolvedState(3);
    for (const face of Object.values(state) as string[][]) {
      expect(face.length).toBe(9);
    }
  });

  it('each face is monochrome in solved state', () => {
    const state = createSolvedState(3);
    for (const face of Object.values(state) as string[][]) {
      expect(new Set(face).size).toBe(1);
    }
  });

  it('all 6 faces have different colors', () => {
    const state = createSolvedState(3);
    const colors = Object.values(state).map((f) => (f as string[])[0]);
    expect(new Set(colors).size).toBe(6);
  });
});
