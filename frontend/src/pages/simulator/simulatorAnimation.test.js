/**
 * simulatorAnimation.test.js — Tests for the animation and move notation helpers
 *
 * Tests all the helper functions that the simulator uses to parse moves,
 * animate cube turns, and track user move history. Covers:
 *   - parseMoveAnimation: does "R" map to the right axis/layer/direction?
 *   - expandMoveToken: does "R2" become ["R", "R"]?
 *   - inverseMove: does "R" become "R'"?
 *   - rotateCubiePosition: does the 3D rotation math produce correct positions?
 *   - mergeMoveIntoSolveStack: do opposite moves cancel each other out?
 *
 * Run with: npx vitest run (from frontend/)
 */
import { describe, expect, it } from 'vitest';
import {
  easeInOutCubic,
  expandMoveToken,
  getCubieLayout,
  invertMoveSequence,
  inverseMove,
  isSliceMove,
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
    expect(parseMoveAnimation('x')).toEqual({ axis: 'x', layer: 'all', direction: -1 });
    expect(parseMoveAnimation("y'")).toEqual({ axis: 'y', layer: 'all', direction: -1 });
    expect(parseMoveAnimation('R', 2)).toEqual({ axis: 'x', layer: 0.5, direction: -1 });
    expect(parseMoveAnimation('L', 4)).toEqual({ axis: 'x', layer: -1.5, direction: 1 });
    expect(parseMoveAnimation('r', 4)).toEqual({ axis: 'x', layer: 0.5, direction: -1 });
    expect(parseMoveAnimation("u'", 4)).toEqual({ axis: 'y', layer: 0.5, direction: -1 });
    expect(parseMoveAnimation('M', 4)).toBeNull();
    expect(parseMoveAnimation('r', 3)).toBeNull();
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
    expect(expandMoveToken('r2')).toEqual(['r', 'r']);
    expect(expandMoveToken('x2')).toEqual(['x', 'x']);
    expect(expandMoveToken("U'")).toEqual(["U'"]);
    expect(expandMoveToken("u'")).toEqual(["u'"]);
    expect(expandMoveToken('  F  ')).toEqual(['F']);
    expect(expandMoveToken('x')).toEqual(['x']);
    expect(expandMoveToken('')).toEqual([]);

    expect(normalizeMoveSequence(['R2', 'M2', 'r2', "U'", "u'", 'x', 'y2', ' B '])).toEqual([
      'R', 'R', 'M', 'M', 'r', 'r', "U'", "u'", 'x', 'y', 'y', 'B',
    ]);
  });

  it('detects slice turns and inverts normalized sequences', () => {
    expect(isSliceMove('M')).toBe(true);
    expect(isSliceMove("E'")).toBe(true);
    expect(isSliceMove('r')).toBe(true);
    expect(isSliceMove("u'")).toBe(true);
    expect(isSliceMove('R')).toBe(false);

    expect(invertMoveSequence(['R', 'U', "M'", 'F2'])).toEqual(["F'", "F'", 'M', "U'", "R'"]);
  });

  it('rotates cubie coordinates consistently across axes', () => {
    expect(rotateCubiePosition({ x: 1, y: 1, z: 0 }, 'z', 1)).toEqual({ x: -1, y: 1, z: 0 });
    expect(rotateCubiePosition({ x: 1, y: 1, z: 0 }, 'z', -1)).toEqual({ x: 1, y: -1, z: 0 });
    expect(rotateCubiePosition({ x: 1, y: 0, z: 1 }, 'y', 1)).toEqual({ x: 1, y: 0, z: -1 });
    expect(rotateCubiePosition({ x: 0, y: 1, z: 1 }, 'x', -1)).toEqual({ x: 0, y: 1, z: -1 });
  });

  it('builds cubie layouts for multiple cube sizes', () => {
    const threeByThreeLayout = getCubieLayout(3);
    expect(threeByThreeLayout).toHaveLength(27);

    const keys = new Set(threeByThreeLayout.map((cubie) => cubie.key));
    expect(keys.size).toBe(27);

    expect(keys.has('-1--1--1')).toBe(true);
    expect(keys.has('0-0-0')).toBe(true);
    expect(keys.has('1-1-1')).toBe(true);

    const twoByTwoLayout = getCubieLayout(2);
    expect(twoByTwoLayout).toHaveLength(8);

    const fourByFourLayout = getCubieLayout(4);
    expect(fourByFourLayout).toHaveLength(64);
    expect(fourByFourLayout.some((cubie) => cubie.key === '-1.5--1.5--1.5')).toBe(true);
    expect(fourByFourLayout.some((cubie) => cubie.key === '1.5-1.5-1.5')).toBe(true);
  });
});
