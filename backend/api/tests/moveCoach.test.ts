import { describe, expect, it } from 'vitest';

import { analyzeMoveValidation } from '../src/lib/moveCoach.js';

const SOLVED_STATE = {
  U: Array(9).fill('W'),
  R: Array(9).fill('R'),
  F: Array(9).fill('G'),
  D: Array(9).fill('Y'),
  L: Array(9).fill('O'),
  B: Array(9).fill('B'),
};

describe('move coach analyzer', () => {
  it('marks unknown moves as illegal corrections', () => {
    const result = analyzeMoveValidation({
      state: SOLVED_STATE,
      candidateMove: 'BAD',
      moveHistory: [],
    });

    expect(result.isLegal).toBe(false);
    expect(result.status).toBe('correction');
    expect(result.shouldBlock).toBe(true);
  });

  it('blocks immediate undo moves during timed solve', () => {
    const result = analyzeMoveValidation({
      state: SOLVED_STATE,
      candidateMove: "R'",
      moveHistory: ['R'],
      isTimedSolve: true,
    });

    expect(result.isLegal).toBe(true);
    expect(result.status).toBe('correction');
    expect(result.shouldBlock).toBe(true);
    expect(result.reason).toContain('undoes your last move');
  });

  it('blocks obvious repeating loops', () => {
    const result = analyzeMoveValidation({
      state: SOLVED_STATE,
      candidateMove: 'R',
      moveHistory: ['R', 'U', "R'", 'R', 'U', "R'"],
    });

    expect(result.isLegal).toBe(true);
    expect(result.status).toBe('correction');
    expect(result.shouldBlock).toBe(true);
    expect(result.reason).toContain('recent loop');
  });

  it('returns score metrics for legal moves', () => {
    const result = analyzeMoveValidation({
      state: SOLVED_STATE,
      candidateMove: 'R',
      moveHistory: ['U'],
      tutorialStepTitle: 'First Two Layers (F2L)',
    });

    expect(result.isLegal).toBe(true);
    expect(typeof result.scoreBefore).toBe('number');
    expect(typeof result.scoreAfter).toBe('number');
    expect(typeof result.scoreDelta).toBe('number');
  });
});
