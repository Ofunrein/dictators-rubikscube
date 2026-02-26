export class CubeState {
  constructor(size = 3) {
    this.size = size;
    this.state = CubeState.createSolvedState();
  }

  static createSolvedState() {
    return {
      U: Array(9).fill('W'),
      R: Array(9).fill('R'),
      F: Array(9).fill('G'),
      D: Array(9).fill('Y'),
      L: Array(9).fill('O'),
      B: Array(9).fill('B')
    };
  }

  setState(nextState) {
    this.state = CubeState.validate(nextState);
  }

  getState() {
    return this.state;
  }

  static validate(candidate) {
    const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
    if (!candidate || typeof candidate !== 'object') {
      throw new Error('Cube state must be an object with U, R, F, D, L, B faces.');
    }

    for (const face of faces) {
      if (!Array.isArray(candidate[face]) || candidate[face].length !== 9) {
        throw new Error(`Cube face ${face} must contain 9 stickers.`);
      }
    }

    return faces.reduce((acc, face) => {
      acc[face] = [...candidate[face]];
      return acc;
    }, {});
  }
}
