export const TURN_DURATION_SECONDS = 0.24;
export const IDLE_ROTATION_SPEED = 0.22;

// Direction values are for clockwise turns of each face token.
export const MOVE_ANIMATIONS = {
  U: { axis: 'y', layer: 1, direction: 1 },
  D: { axis: 'y', layer: -1, direction: -1 },
  R: { axis: 'x', layer: 1, direction: -1 },
  L: { axis: 'x', layer: -1, direction: 1 },
  F: { axis: 'z', layer: 1, direction: -1 },
  B: { axis: 'z', layer: -1, direction: 1 },
};

export const CUBIE_LAYOUT = [];
for (let x = -1; x <= 1; x += 1) {
  for (let y = -1; y <= 1; y += 1) {
    for (let z = -1; z <= 1; z += 1) {
      CUBIE_LAYOUT.push({
        key: `${x}-${y}-${z}`,
        x,
        y,
        z,
        position: [x, y, z],
      });
    }
  }
}

export function parseMoveAnimation(move) {
  if (typeof move !== 'string' || move.length === 0) {
    return null;
  }

  const token = move.trim();
  if (!token) {
    return null;
  }

  const baseMove = token.replace("'", '');
  const config = MOVE_ANIMATIONS[baseMove];
  if (!config) return null;
  return {
    ...config,
    direction: token.endsWith("'") ? -config.direction : config.direction,
  };
}

export function easeInOutCubic(t) {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function inverseMove(move) {
  return move.endsWith("'") ? move.slice(0, -1) : `${move}'`;
}

export function mergeMoveIntoSolveStack(stack, move) {
  const inverse = inverseMove(move);
  if (stack.length > 0 && stack[stack.length - 1] === inverse) {
    stack.pop();
    return;
  }
  stack.push(move);
}

export function expandMoveToken(move) {
  const token = move?.trim();
  if (!token) return [];
  if (/^[URFDLB]2$/.test(token)) {
    return [token[0], token[0]];
  }
  if (/^[URFDLB]'?$/.test(token)) {
    return [token];
  }
  return [];
}

export function normalizeMoveSequence(sequence) {
  return sequence.flatMap(expandMoveToken);
}
