/**
 * CubeState.js — Small wrapper around the shared cube model helpers
 *
 * The simulator still likes having a little class with getState()/setState(),
 * but the real validation and solved-state generation now live in cubeModel.js
 * so the frontend and backend can both reuse the exact same size-aware rules.
 */

import {
  cloneCubeState,
  createSolvedState,
  normalizeCubeSize,
  validateCubeState,
} from './cubeModel.js';

export class CubeState {
  constructor(size = 3) {
    this.size = normalizeCubeSize(size);
    this.state = CubeState.createSolvedState(this.size);
  }

  static createSolvedState(size = 3) {
    return createSolvedState(size);
  }

  setState(nextState) {
    this.state = CubeState.validate(nextState, this.size);
  }

  getState() {
    return cloneCubeState(this.state);
  }

  static validate(candidate, expectedSize) {
    return validateCubeState(candidate, expectedSize);
  }
}
