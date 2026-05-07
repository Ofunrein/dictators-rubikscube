/**
 * CubeState.ts — Small wrapper around the shared cube model helpers
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
