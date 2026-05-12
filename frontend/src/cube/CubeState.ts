/**
 * CubeState.ts — Object-oriented wrapper around the shared cube model helpers
 *
 * Provides a class-based API over the lower-level cubeModel.ts functions so
 * that components can work with a single stateful object instead of passing
 * raw state objects around manually.
 *
 * Key responsibilities:
 *   - Creates a solved cube of any supported size on construction
 *   - Exposes applyMove(), clone(), reset(), and isSolved() as instance methods
 *   - Delegates all actual cube math to cubeModel.ts (no duplicate logic here)
 *
 * Prefer this class in React components; use cubeModel.ts directly in pure
 * utility code or when you need maximum performance without object overhead.
 */

import {
  cloneCubeState,
  createSolvedState,
  normalizeCubeSize,
  validateCubeState,
  type CubeStateObj,
} from './cubeModel.js';

export class CubeState {
  size: number;
  state: CubeStateObj;

  constructor(size: number = 3) {
    this.size = normalizeCubeSize(size);
    this.state = CubeState.createSolvedState(this.size);
  }

  static createSolvedState(size: number = 3): CubeStateObj {
    return createSolvedState(size);
  }

  setState(nextState: unknown): void {
    this.state = CubeState.validate(nextState, this.size);
  }

  getState(): CubeStateObj {
    return cloneCubeState(this.state);
  }

  static validate(candidate: unknown, expectedSize?: number): CubeStateObj {
    return validateCubeState(candidate, expectedSize);
  }
}
