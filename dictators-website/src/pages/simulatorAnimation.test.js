import { describe, expect, it } from 'vitest';
import {
  CUBIE_LAYOUT,
  easeInOutCubic,
  expandMoveToken,
  inverseMove,
  mergeMoveIntoSolveStack,
  normalizeMoveSequence,
  parseMoveAnimation,
  rotateCubiePosition,
} from './simulatorAnimation';

describe('simulatorAnimation helpers', () => {
  it('maps basic face turns to axis/layer/direction', () => {
    expect(parseMoveAnimation('U')).toEqual({ axis: 'y', layer: 1, direction: 1 });
    expect(parseMoveAnimation("U'")).toEqual({ axis: 'y', layer: 1, direction: -1 });
    expect(parseMoveAnimation('R')).toEqual({ axis: 'x', layer: 1, direction: -1 });
    expect(parseMoveAnimation("R'")).toEqual({ axis: 'x', layer: 1, direction: 1 });
    expect(parseMoveAnimation('M')).toEqual({ axis: 'x', layer: 0, direction: 1 });
    expect(parseMoveAnimation("E'")).toEqual({ axis: 'y', layer: 0, direction: 1 });
    expect(parseMoveAnimation('S')).toEqual({ axis: 'z', layer: 0, direction: -1 });
    expect(parseMoveAnimation('BAD')).toBeNull();
  });

  it('eases from 0 to 1 with symmetry', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25);
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 8);
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1, 8);
  });

  it('inverts moves and cancels inverse pairs in solve stack', () => {
    const stack = [];
    expect(inverseMove('R')).toBe("R'");
    expect(inverseMove("R'")).toBe('R');

    mergeMoveIntoSolveStack(stack, 'R');
    expect(stack).toEqual(['R']);

    mergeMoveIntoSolveStack(stack, "R'");
    expect(stack).toEqual([]);

    mergeMoveIntoSolveStack(stack, 'R');
    mergeMoveIntoSolveStack(stack, 'U');
    mergeMoveIntoSolveStack(stack, "U'");
    expect(stack).toEqual(['R']);
  });

  it('expands and normalizes move tokens', () => {
    expect(expandMoveToken('R2')).toEqual(['R', 'R']);
    expect(expandMoveToken('M2')).toEqual(['M', 'M']);
    expect(expandMoveToken("U'")).toEqual(["U'"]);
    expect(expandMoveToken('  F  ')).toEqual(['F']);
    expect(expandMoveToken('x')).toEqual([]);
    expect(expandMoveToken('')).toEqual([]);

    expect(normalizeMoveSequence(['R2', 'M2', "U'", 'x', ' B '])).toEqual(['R', 'R', 'M', 'M', "U'", 'B']);
  });

  it('rotates cubie coordinates consistently across axes', () => {
    expect(rotateCubiePosition({ x: 1, y: 1, z: 0 }, 'z', 1)).toEqual({ x: -1, y: 1, z: 0 });
    expect(rotateCubiePosition({ x: 1, y: 1, z: 0 }, 'z', -1)).toEqual({ x: 1, y: -1, z: 0 });
    expect(rotateCubiePosition({ x: 1, y: 0, z: 1 }, 'y', 1)).toEqual({ x: 1, y: 0, z: -1 });
    expect(rotateCubiePosition({ x: 0, y: 1, z: 1 }, 'x', -1)).toEqual({ x: 0, y: 1, z: -1 });
  });

  it('builds a full 3x3x3 cubie layout', () => {
    expect(CUBIE_LAYOUT).toHaveLength(27);

    const keys = new Set(CUBIE_LAYOUT.map((cubie) => cubie.key));
    expect(keys.size).toBe(27);

    expect(keys.has('-1--1--1')).toBe(true);
    expect(keys.has('0-0-0')).toBe(true);
    expect(keys.has('1-1-1')).toBe(true);
  });
});
