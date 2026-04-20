/**
 * simulatorConstants.js
 *
 * Shared constants and UI-friendly helpers for the simulator.
 * The real cube math lives in cubeModel.js and moves.js. This file only decides
 * what the UI should show for each supported size.
 */

import {
  FACE_ORDER,
  SUPPORTED_CUBE_SIZES,
  normalizeCubeSize,
} from '../../cube/cubeModel.js';
import { getSupportedMoves } from '../../cube/moves.js';

export { FACE_ORDER };
export const CUBE_SIZE_OPTIONS = SUPPORTED_CUBE_SIZES;

export const TOKEN_HEX = {
  W: '#FFFFFF',
  R: '#CC1A1A',
  G: '#2E8B57',
  Y: '#FFD700',
  O: '#FF8C00',
  B: '#1E90FF',
};

const BASE_MOVE_GROUPS = [
  { label: 'U Face', moves: ['U', "U'"] },
  { label: 'D Face', moves: ['D', "D'"] },
  { label: 'R Face', moves: ['R', "R'"] },
  { label: 'L Face', moves: ['L', "L'"] },
  { label: 'F Face', moves: ['F', "F'"] },
  { label: 'B Face', moves: ['B', "B'"] },
];

const SLICE_MOVE_GROUPS = [
  { label: 'M Slice', moves: ['M', "M'"] },
  { label: 'E Slice', moves: ['E', "E'"] },
  { label: 'S Slice', moves: ['S', "S'"] },
];

const INNER_FOUR_BY_FOUR_GROUPS = [
  { label: 'u Inner', moves: ['u', "u'"] },
  { label: 'd Inner', moves: ['d', "d'"] },
  { label: 'r Inner', moves: ['r', "r'"] },
  { label: 'l Inner', moves: ['l', "l'"] },
  { label: 'f Inner', moves: ['f', "f'"] },
  { label: 'b Inner', moves: ['b', "b'"] },
];

const BASE_KEY_MAP = {
  u: 'U', U: "U'",
  d: 'D', D: "D'",
  r: 'R', R: "R'",
  l: 'L', L: "L'",
  f: 'F', F: "F'",
  b: 'B', B: "B'",
};

const SLICE_KEY_MAP = {
  m: 'M', M: "M'",
  e: 'E', E: "E'",
  s: 'S', S: "S'",
};

// 4x4 inner slices need their own shortcuts because lowercase face letters are
// already used for outer turns. These keys sit near the right/home rows so they
// stay separate from the basic U D L R F B shortcuts.
const FOUR_BY_FOUR_INNER_KEY_MAP = {
  i: 'u', I: "u'",
  k: 'd', K: "d'",
  o: 'r', O: "r'",
  j: 'l', J: "l'",
  y: 'f', Y: "f'",
  h: 'b', H: "b'",
};

export function getMoveGroups(size = 3) {
  const normalizedSize = normalizeCubeSize(size);

  if (normalizedSize === 4) {
    return [...BASE_MOVE_GROUPS, ...INNER_FOUR_BY_FOUR_GROUPS];
  }

  if (normalizedSize % 2 === 1) {
    return [...BASE_MOVE_GROUPS, ...SLICE_MOVE_GROUPS];
  }

  return BASE_MOVE_GROUPS;
}

export function getKeyMap(size = 3) {
  const normalizedSize = normalizeCubeSize(size);

  if (normalizedSize === 4) {
    return { ...BASE_KEY_MAP, ...FOUR_BY_FOUR_INNER_KEY_MAP };
  }

  if (normalizedSize % 2 === 1) {
    return { ...BASE_KEY_MAP, ...SLICE_KEY_MAP };
  }

  return BASE_KEY_MAP;
}

export const MOVE_GROUPS = getMoveGroups(3);
export const KEY_MAP = getKeyMap(3);

export const TUTORIAL_STEPS = [
  {
    title: 'Notation Basics',
    body: 'Each letter represents a face: U (Up), D (Down), R (Right), L (Left), F (Front), B (Back). A plain letter = clockwise. A prime (′) = counter-clockwise.',
  },
  {
    title: 'The Cross',
    body: 'Start by solving a cross on the U (white) face. Find the 4 white edge pieces and bring them to the top layer, matching the center colors on each side.',
  },
  {
    title: 'First Two Layers (F2L)',
    body: 'Pair each corner with its matching edge piece and insert them into the correct slot using R U R′ U′ or L′ U′ L U.',
  },
  {
    title: 'Orient Last Layer (OLL)',
    body: 'Make the top face all one color using OLL algorithms. The most common beginner OLL: F R U R′ U′ F′.',
  },
  {
    title: 'Permute Last Layer (PLL)',
    body: 'Move the top layer pieces into their correct positions. Common PLL: R U R′ U R U2 R′ (U-Perm).',
  },
];

export const TUTORIAL_STEPS_2X2 = [
  {
    title: 'Notation Basics',
    body: 'Same as 3x3: U (Up), D (Down), R (Right), L (Left), F (Front), B (Back). No edge pieces on a 2x2 — only corners, so every move affects the whole face.',
  },
  {
    title: 'Solve One Face',
    body: 'Pick a color (usually white). Get all 4 corners of that color on one face. The side colors of those corners must also match each other.',
  },
  {
    title: 'Orient Last Layer (OLL)',
    body: 'Flip the remaining corners so the top face is one solid color. Use Sune (R U R′ U R U2 R′) repeatedly until all top stickers match.',
  },
  {
    title: 'Permute Last Layer (PLL)',
    body: 'Swap corners into their correct positions. Use the Y-Perm or T-Perm to cycle three corners until the cube is solved.',
  },
];

export const TUTORIAL_STEPS_4X4 = [
  {
    title: 'Notation Basics',
    body: 'Uppercase letters (R, U, F…) turn the outer layer. Lowercase letters (r, u, f…) turn the inner slice next to that face. A prime (′) means counter-clockwise.',
  },
  {
    title: 'Centers',
    body: 'Group the 4 center pieces of each face into a solid 2x2 block. Use inner-slice moves (r, u, l…) to pair centers without breaking ones already built.',
  },
  {
    title: 'Edge Pairing',
    body: 'Pair the split edge pieces into full edges using the "slice-flip-slice" technique. Hold a matched pair in FR, do a U move, slice, then undo.',
  },
  {
    title: 'Reduce to 3x3',
    body: 'Once all centers are grouped and edges are paired, solve it like a 3x3 — Cross, F2L, OLL, PLL. Treat paired edges as single edges.',
  },
  {
    title: 'Parity Fixes',
    body: 'Two extra cases appear on 4x4: OLL Parity (one flipped edge) and PLL Parity (two swapped edges). These require dedicated parity algorithms.',
  },
];

export const QUICK_ALGORITHMS = [
  { name: 'Sexy Move', moves: ['R', 'U', "R'", "U'"] },
  { name: 'F2L Insert', moves: ['U', 'R', "U'", "R'"] },
  { name: 'OLL (Sune)', moves: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"] },
  { name: 'PLL (U-Perm)', moves: ['R', "U'", 'R', 'U', 'R', 'U', 'R', "U'", "R'", "U'", 'R2'] },
  { name: 'T-Perm', moves: ['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"] },
];

export const QUICK_ALGORITHMS_2X2 = [
  { name: 'Sexy Move', moves: ['R', 'U', "R'", "U'"] },
  { name: 'Sune (OLL)', moves: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"] },
  { name: 'Anti-Sune', moves: ['R', 'U2', "R'", "U'", 'R', "U'", "R'"] },
  { name: 'Y-Perm', moves: ['F', 'R', "U'", "R'", "U'", 'R', 'U', "R'", "F'", 'R', 'U', "R'", "U'", "R'", 'F', 'R', "F'"] },
  { name: 'T-Perm', moves: ['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"] },
];

export const QUICK_ALGORITHMS_4X4 = [
  { name: 'Sexy Move', moves: ['R', 'U', "R'", "U'"] },
  { name: 'Sune (OLL)', moves: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"] },
  { name: 'OLL Parity', moves: ['r', 'U2', 'r', 'U2', "r'", 'U2', 'r', 'U2', "l'", 'U2', 'r', 'U2', "r'", 'U2', 'r', 'U2', 'r'] },
  { name: 'PLL Parity', moves: ['R2', 'U2', 'R2', 'u2', 'R2', 'u2'] },
  { name: 'T-Perm', moves: ['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"] },
];

export const SIMULATOR_CONTROL_SECTIONS = [
  {
    title: 'Turn Faces',
    body: 'Desktop: left-drag a sticker to turn that layer. Mobile: drag directly on a sticker to turn, or use the move buttons if you want a precise backup.',
  },
  {
    title: 'Move Your View',
    body: 'Desktop: right-drag empty space to orbit the whole cube. Mobile and tablets: drag on empty space with two fingers, then pinch to zoom when you need a different angle.',
  },
  {
    title: 'Alternative Inputs',
    body: 'You can still tap a sticker, then use arrow keys or the move buttons. That gives you a slower but very exact way to test turns without dragging.',
  },
];

export function getDefaultScrambleLength(size = 3) {
  const normalizedSize = normalizeCubeSize(size);
  if (normalizedSize === 2) return 14;
  if (normalizedSize === 4) return 40;
  return 25;
}

export function generateScramble(size = 3, length = getDefaultScrambleLength(size)) {
  const normalizedSize = normalizeCubeSize(size);
  const allowedMoves = getSupportedMoves(normalizedSize).filter((move) => /^[URFDLB]'?$/.test(move));
  const result = [];
  let lastFace = '';

  for (let index = 0; index < length; index += 1) {
    let move;
    do {
      move = allowedMoves[Math.floor(Math.random() * allowedMoves.length)];
    } while (move[0] === lastFace);

    result.push(move);
    lastFace = move[0];
  }

  return result;
}

export function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes > 0 ? `${minutes}:` : ''}${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}
