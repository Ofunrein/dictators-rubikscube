import { describe, expect, it } from 'vitest';

import {
  buildCubieLayout,
  cloneCubeState,
  collectCubeStateDetails,
  createSolvedState,
  createStickerModel,
  FACE_COLORS,
  FACE_ORDER,
  getFaceRowColFromAddress,
  getFaceSize,
  getCoordinateValues,
  getStickerAddress,
  normalizeCubeSize,
  stickersToState,
  STICKER_TOKENS,
  SUPPORTED_CUBE_SIZES,
  validateCubeState,
} from './cubeModel.js';
import { CubeState } from './CubeState.js';

describe('constants', () => {
  it('FACE_ORDER has exactly 6 faces', () => {
    expect(FACE_ORDER).toEqual(['U', 'R', 'F', 'D', 'L', 'B']);
  });

  it('STICKER_TOKENS has 6 color tokens', () => {
    expect(STICKER_TOKENS).toHaveLength(6);
    expect(STICKER_TOKENS).toContain('W');
    expect(STICKER_TOKENS).toContain('R');
    expect(STICKER_TOKENS).toContain('G');
    expect(STICKER_TOKENS).toContain('Y');
    expect(STICKER_TOKENS).toContain('O');
    expect(STICKER_TOKENS).toContain('B');
  });

  it('SUPPORTED_CUBE_SIZES is [2, 3, 4]', () => {
    expect(SUPPORTED_CUBE_SIZES).toEqual([2, 3, 4]);
  });

  it('FACE_COLORS maps each face to its color', () => {
    expect(FACE_COLORS.U).toBe('W');
    expect(FACE_COLORS.R).toBe('R');
    expect(FACE_COLORS.F).toBe('G');
    expect(FACE_COLORS.D).toBe('Y');
    expect(FACE_COLORS.L).toBe('O');
    expect(FACE_COLORS.B).toBe('B');
  });
});

describe('normalizeCubeSize', () => {
  it('returns valid sizes as numbers', () => {
    expect(normalizeCubeSize(2)).toBe(2);
    expect(normalizeCubeSize(3)).toBe(3);
    expect(normalizeCubeSize(4)).toBe(4);
  });

  it('coerces a numeric string', () => {
    expect(normalizeCubeSize('3')).toBe(3);
  });

  it('throws for unsupported sizes', () => {
    expect(() => normalizeCubeSize(1)).toThrow();
    expect(() => normalizeCubeSize(5)).toThrow();
    expect(() => normalizeCubeSize(0)).toThrow();
  });

  it('throws for non-integer values', () => {
    expect(() => normalizeCubeSize(3.5)).toThrow();
    expect(() => normalizeCubeSize('abc')).toThrow();
  });
});

describe('getCoordinateValues', () => {
  it('returns [-0.5, 0.5] for 2x2', () => {
    expect(getCoordinateValues(2)).toEqual([-0.5, 0.5]);
  });

  it('returns [-1, 0, 1] for 3x3', () => {
    expect(getCoordinateValues(3)).toEqual([-1, 0, 1]);
  });

  it('returns [-1.5, -0.5, 0.5, 1.5] for 4x4', () => {
    expect(getCoordinateValues(4)).toEqual([-1.5, -0.5, 0.5, 1.5]);
  });

  it('has length equal to the cube size', () => {
    for (const size of [2, 3, 4]) {
      expect(getCoordinateValues(size)).toHaveLength(size);
    }
  });

  it('is centered at zero (sum of coords is 0)', () => {
    for (const size of [2, 3, 4]) {
      const sum = getCoordinateValues(size).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum)).toBeLessThan(1e-10);
    }
  });
});

describe('createSolvedState', () => {
  it('creates a 3x3 solved state with 9 stickers per face', () => {
    const state = createSolvedState(3);
    for (const face of FACE_ORDER) {
      expect(state[face]).toHaveLength(9);
      expect(state[face].every((s) => s === state[face][0])).toBe(true);
    }
  });

  it('creates a 2x2 solved state with 4 stickers per face', () => {
    const state = createSolvedState(2);
    for (const face of FACE_ORDER) {
      expect(state[face]).toHaveLength(4);
    }
  });

  it('creates a 4x4 solved state with 16 stickers per face', () => {
    const state = createSolvedState(4);
    for (const face of FACE_ORDER) {
      expect(state[face]).toHaveLength(16);
    }
  });

  it('each face has its own correct color', () => {
    const state = createSolvedState(3);
    expect(state.U[0]).toBe('W');
    expect(state.R[0]).toBe('R');
    expect(state.F[0]).toBe('G');
    expect(state.D[0]).toBe('Y');
    expect(state.L[0]).toBe('O');
    expect(state.B[0]).toBe('B');
  });
});

describe('cloneCubeState', () => {
  it('produces a deep copy', () => {
    const original = createSolvedState(3);
    const clone = cloneCubeState(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.U).not.toBe(original.U);
  });

  it('mutations to the clone do not affect the original', () => {
    const original = createSolvedState(3);
    const clone = cloneCubeState(original);
    clone.U[0] = 'R';
    expect(original.U[0]).toBe('W');
  });
});

describe('getFaceSize', () => {
  it('returns correct size for solved states', () => {
    expect(getFaceSize(createSolvedState(2))).toBe(2);
    expect(getFaceSize(createSolvedState(3))).toBe(3);
    expect(getFaceSize(createSolvedState(4))).toBe(4);
  });

  it('returns null for null or non-objects', () => {
    expect(getFaceSize(null)).toBeNull();
    expect(getFaceSize('string')).toBeNull();
    expect(getFaceSize(42)).toBeNull();
  });

  it('returns null when a face array is missing', () => {
    const broken = createSolvedState(3);
    delete broken.U;
    expect(getFaceSize(broken)).toBeNull();
  });

  it('returns null when face lengths are inconsistent', () => {
    const broken = createSolvedState(3);
    broken.U = broken.U.slice(0, 4);
    expect(getFaceSize(broken)).toBeNull();
  });
});

describe('collectCubeStateDetails', () => {
  it('returns no errors for a valid solved state', () => {
    const details = collectCubeStateDetails(createSolvedState(3), 3);
    expect(details).toHaveLength(0);
  });

  it('returns error for a non-object', () => {
    const details = collectCubeStateDetails('bad');
    expect(details.length).toBeGreaterThan(0);
  });

  it('returns error for unknown face key', () => {
    const state = { ...createSolvedState(3), X: ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'] };
    const details = collectCubeStateDetails(state, 3);
    expect(details.some((d) => d.path === 'state.X')).toBe(true);
  });

  it('returns error for invalid sticker token', () => {
    const state = createSolvedState(3);
    state.U[0] = 'Z';
    const details = collectCubeStateDetails(state, 3);
    expect(details.length).toBeGreaterThan(0);
    expect(details[0].path).toMatch(/state\.U/);
  });

  it('returns error when face count does not match expected size', () => {
    const state3 = createSolvedState(3);
    const details = collectCubeStateDetails(state3, 4);
    expect(details.length).toBeGreaterThan(0);
  });

  it('collects ALL problems, not just the first one', () => {
    const state = createSolvedState(3);
    state.U[0] = 'Z';
    state.R[0] = 'Z';
    const details = collectCubeStateDetails(state, 3);
    expect(details.length).toBeGreaterThanOrEqual(2);
  });
});

describe('validateCubeState', () => {
  it('returns a clone of a valid state', () => {
    const original = createSolvedState(3);
    const validated = validateCubeState(original, 3);
    expect(validated).toEqual(original);
    expect(validated).not.toBe(original);
  });

  it('throws for an invalid state', () => {
    const bad = createSolvedState(3);
    bad.U[0] = 'Z';
    expect(() => validateCubeState(bad, 3)).toThrow();
  });
});

describe('getStickerAddress', () => {
  it('returns correct coordinates for F face top-left on 3x3', () => {
    const addr = getStickerAddress('F', 0, 0, 3);
    expect(addr.face).toBe('F');
    expect(addr.z).toBe(1);
    expect(addr.nz).toBe(1);
  });

  it('returns correct coordinates for U face on 3x3', () => {
    const addr = getStickerAddress('U', 0, 0, 3);
    expect(addr.y).toBe(1);
    expect(addr.ny).toBe(1);
  });

  it('throws for unknown face', () => {
    expect(() => getStickerAddress('X', 0, 0, 3)).toThrow();
  });

  it('throws for out-of-bounds row/col', () => {
    expect(() => getStickerAddress('F', 3, 0, 3)).toThrow();
    expect(() => getStickerAddress('F', 0, 3, 3)).toThrow();
    expect(() => getStickerAddress('F', -1, 0, 3)).toThrow();
  });
});

describe('getFaceRowColFromAddress', () => {
  it('round-trips through getStickerAddress', () => {
    const size = 3;
    for (const face of FACE_ORDER) {
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const addr = getStickerAddress(face, row, col, size);
          const back = getFaceRowColFromAddress(face, addr.x, addr.y, addr.z, size);
          expect(back.row).toBe(row);
          expect(back.col).toBe(col);
        }
      }
    }
  });
});

describe('createStickerModel + stickersToState round-trip', () => {
  it('round-trips solved state for all sizes', () => {
    for (const size of [2, 3, 4]) {
      const solved = createSolvedState(size);
      const stickers = createStickerModel(solved);
      const restored = stickersToState(stickers, size);
      expect(restored).toEqual(solved);
    }
  });

  it('produces correct sticker count', () => {
    const stickers3 = createStickerModel(createSolvedState(3));
    expect(stickers3).toHaveLength(6 * 9);

    const stickers4 = createStickerModel(createSolvedState(4));
    expect(stickers4).toHaveLength(6 * 16);
  });
});

describe('buildCubieLayout', () => {
  it('produces 27 cubies for 3x3', () => {
    expect(buildCubieLayout(3)).toHaveLength(27);
  });

  it('produces 8 cubies for 2x2', () => {
    expect(buildCubieLayout(2)).toHaveLength(8);
  });

  it('produces 64 cubies for 4x4', () => {
    expect(buildCubieLayout(4)).toHaveLength(64);
  });

  it('each cubie has a unique key', () => {
    const cubies = buildCubieLayout(3);
    const keys = cubies.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('cubie position array matches x/y/z properties', () => {
    const cubies = buildCubieLayout(3);
    for (const cubie of cubies) {
      expect(cubie.position).toEqual([cubie.x, cubie.y, cubie.z]);
    }
  });
});

describe('CubeState', () => {
  it('constructor creates a solved state for the given size', () => {
    for (const size of [2, 3, 4]) {
      const cs = new CubeState(size);
      expect(cs.size).toBe(size);
      expect(cs.getState()).toEqual(createSolvedState(size));
    }
  });

  it('getState returns a clone, not the internal reference', () => {
    const cs = new CubeState(3);
    const state = cs.getState();
    state.U[0] = 'R';
    expect(cs.getState().U[0]).toBe('W');
  });

  it('setState accepts a valid state and updates it', () => {
    const cs = new CubeState(3);
    const solved = createSolvedState(3);
    cs.setState(solved);
    expect(cs.getState()).toEqual(solved);
  });

  it('setState throws for an invalid state', () => {
    const cs = new CubeState(3);
    const bad = createSolvedState(3);
    bad.U[0] = 'Z';
    expect(() => cs.setState(bad)).toThrow();
  });

  it('createSolvedState static method returns correct solved state', () => {
    expect(CubeState.createSolvedState(3)).toEqual(createSolvedState(3));
  });

  it('validate static method throws for invalid state', () => {
    const bad = createSolvedState(3);
    bad.U[0] = 'X';
    expect(() => CubeState.validate(bad, 3)).toThrow();
  });
});
