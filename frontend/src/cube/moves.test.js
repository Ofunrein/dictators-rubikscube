import { describe, expect, it } from 'vitest';

import { createSolvedState, FACE_ORDER } from './cubeModel.js';
import {
  applyMove,
  applyMoves,
  expandMoveToken,
  getSupportedMoves,
  isSupportedMove,
  MOVES,
  normalizeMoveSequence,
} from './moves.js';

function isSolved(state) {
  return FACE_ORDER.every((face) => state[face].every((s) => s === state[face][0]));
}

describe('getSupportedMoves', () => {
  it('returns 36 moves for a 3x3 (6 faces + 3 slices + 3 rotations, each with plain/prime/double)', () => {
    const moves = getSupportedMoves(3);
    expect(moves).toHaveLength(36);
  });

  it('returns 27 moves for a 2x2 (6 faces + 3 rotations, each with plain/prime/double, no slices)', () => {
    const moves = getSupportedMoves(2);
    expect(moves).toHaveLength(27);
  });

  it('includes inner-layer moves only for 4x4', () => {
    const moves4 = getSupportedMoves(4);
    expect(moves4).toContain('r');
    expect(moves4).toContain("r'");
    expect(moves4).toContain('r2');
    expect(getSupportedMoves(3)).not.toContain('r');
  });

  it('includes M, E, S only for odd-size cubes', () => {
    const moves3 = getSupportedMoves(3);
    expect(moves3).toContain('M');
    expect(moves3).toContain('E');
    expect(moves3).toContain('S');
    expect(getSupportedMoves(2)).not.toContain('M');
    expect(getSupportedMoves(4)).not.toContain('M');
  });

  it('includes x, y, z rotations for all sizes', () => {
    for (const size of [2, 3, 4]) {
      const moves = getSupportedMoves(size);
      expect(moves).toContain('x');
      expect(moves).toContain('y');
      expect(moves).toContain('z');
    }
  });
});

describe('MOVES constant', () => {
  it('equals getSupportedMoves(3)', () => {
    expect(MOVES).toEqual(getSupportedMoves(3));
  });
});

describe('expandMoveToken', () => {
  it('returns single-element array for a plain move', () => {
    expect(expandMoveToken('R')).toEqual(['R']);
    expect(expandMoveToken('U')).toEqual(['U']);
  });

  it('returns prime move as a single element', () => {
    expect(expandMoveToken("R'")).toEqual(["R'"]);
    expect(expandMoveToken("U'")).toEqual(["U'"]);
  });

  it('expands double moves into two single moves', () => {
    expect(expandMoveToken('R2')).toEqual(['R', 'R']);
    expect(expandMoveToken('U2')).toEqual(['U', 'U']);
  });

  it('returns empty array for unknown tokens', () => {
    expect(expandMoveToken('Q')).toEqual([]);
    expect(expandMoveToken('RR')).toEqual([]);
    expect(expandMoveToken('')).toEqual([]);
    expect(expandMoveToken(null)).toEqual([]);
  });

  it('trims whitespace before parsing', () => {
    expect(expandMoveToken(' R ')).toEqual(['R']);
  });
});

describe('normalizeMoveSequence', () => {
  it('expands double moves inline', () => {
    expect(normalizeMoveSequence(['R2', 'U'])).toEqual(['R', 'R', 'U']);
  });

  it('handles a mixed sequence', () => {
    expect(normalizeMoveSequence(["R'", 'U2', 'F'])).toEqual(["R'", 'U', 'U', 'F']);
  });

  it('returns empty array for empty input', () => {
    expect(normalizeMoveSequence([])).toEqual([]);
  });
});

describe('isSupportedMove', () => {
  it('accepts valid 3x3 face moves', () => {
    for (const move of ["R", "U", "F", "D", "L", "B", "R'", "U2"]) {
      expect(isSupportedMove(move, 3)).toBe(true);
    }
  });

  it('rejects inner-slice moves on 3x3', () => {
    expect(isSupportedMove('r', 3)).toBe(false);
    expect(isSupportedMove('u', 3)).toBe(false);
  });

  it('accepts inner-slice moves on 4x4', () => {
    expect(isSupportedMove('r', 4)).toBe(true);
    expect(isSupportedMove("u'", 4)).toBe(true);
    expect(isSupportedMove('f2', 4)).toBe(true);
  });

  it('rejects M, E, S on 2x2', () => {
    expect(isSupportedMove('M', 2)).toBe(false);
    expect(isSupportedMove('E', 2)).toBe(false);
  });

  it('accepts M, E, S on 3x3', () => {
    expect(isSupportedMove('M', 3)).toBe(true);
    expect(isSupportedMove("E'", 3)).toBe(true);
    expect(isSupportedMove('S2', 3)).toBe(true);
  });

  it('rejects completely unknown moves', () => {
    expect(isSupportedMove('Q', 3)).toBe(false);
    expect(isSupportedMove('', 3)).toBe(false);
  });
});

describe('applyMove', () => {
  it('returns a new state object without mutating the input', () => {
    const solved = createSolvedState(3);
    const original = JSON.stringify(solved);
    applyMove(solved, 'R');
    expect(JSON.stringify(solved)).toBe(original);
  });

  it('R followed by R-prime returns to solved on 3x3', () => {
    const solved = createSolvedState(3);
    const after = applyMove(applyMove(solved, 'R'), "R'");
    expect(isSolved(after)).toBe(true);
  });

  it('four R moves return to solved on 3x3', () => {
    let state = createSolvedState(3);
    for (let i = 0; i < 4; i++) state = applyMove(state, 'R');
    expect(isSolved(state)).toBe(true);
  });

  it('R2 equals two R moves', () => {
    const solved = createSolvedState(3);
    const viaDouble = applyMove(solved, 'R2');
    const viaTwice = applyMove(applyMove(solved, 'R'), 'R');
    expect(viaDouble).toEqual(viaTwice);
  });

  it('a single R move changes the U face but not the L face', () => {
    const solved = createSolvedState(3);
    const after = applyMove(solved, 'R');
    // U face loses its right column to B; L face is untouched
    expect(after.U).not.toEqual(solved.U);
    expect(after.L).toEqual(solved.L);
  });

  it('whole-cube x rotation does not change the solved state appearance', () => {
    const solved = createSolvedState(3);
    const after = applyMove(solved, 'x');
    expect(isSolved(after)).toBe(true);
  });

  it('inner-layer r move on 4x4 returns a state with matching face count', () => {
    const solved = createSolvedState(4);
    const after = applyMove(solved, 'r');
    for (const face of FACE_ORDER) {
      expect(after[face]).toHaveLength(16);
    }
  });

  it('r followed by r-prime returns to solved on 4x4', () => {
    const solved = createSolvedState(4);
    const after = applyMove(applyMove(solved, 'r'), "r'");
    expect(isSolved(after)).toBe(true);
  });

  it('returns cloned state unchanged for an unsupported move token', () => {
    const solved = createSolvedState(3);
    const after = applyMove(solved, 'Q');
    expect(after).toEqual(solved);
  });
});

describe('applyMoves', () => {
  it('applies a sequence of moves in order', () => {
    const solved = createSolvedState(3);
    const manual = applyMove(applyMove(solved, 'R'), 'U');
    const sequence = applyMoves(solved, ['R', 'U']);
    expect(sequence).toEqual(manual);
  });

  it('expands double moves in the sequence', () => {
    const solved = createSolvedState(3);
    const viaApplyMoves = applyMoves(solved, ['R2']);
    const manual = applyMove(applyMove(solved, 'R'), 'R');
    expect(viaApplyMoves).toEqual(manual);
  });

  it('applying a move and its inverse returns solved for all sizes', () => {
    const pairs = [
      { size: 2, moves: ['U', 'D', 'L', 'R', 'F', 'B'] },
      { size: 3, moves: ['U', 'D', 'L', 'R', 'F', 'B', 'M', 'E', 'S'] },
      { size: 4, moves: ['U', 'D', 'L', 'R', 'F', 'B', 'u', 'd', 'r', 'l'] },
    ];

    for (const { size, moves } of pairs) {
      const solved = createSolvedState(size);
      for (const move of moves) {
        const after = applyMoves(solved, [move, `${move}'`]);
        expect(isSolved(after)).toBe(true);
      }
    }
  });

  it('returns cloned solved state for an empty sequence', () => {
    const solved = createSolvedState(3);
    const after = applyMoves(solved, []);
    expect(after).toEqual(solved);
    expect(after).not.toBe(solved);
  });
});
