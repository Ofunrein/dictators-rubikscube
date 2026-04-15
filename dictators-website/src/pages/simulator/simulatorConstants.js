import { MOVES } from '../../cube/moves';

const SCRAMBLE_MOVES = MOVES.filter((move) => !/^[MESxyz]/.test(move));

export const TOKEN_HEX = {
  W: '#FFFFFF',
  R: '#CC1A1A',
  G: '#2E8B57',
  Y: '#FFD700',
  O: '#FF8C00',
  B: '#1E90FF',
};

export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

export const MOVE_GROUPS = [
  { label: 'U Face', moves: ['U', "U'"] },
  { label: 'D Face', moves: ['D', "D'"] },
  { label: 'R Face', moves: ['R', "R'"] },
  { label: 'L Face', moves: ['L', "L'"] },
  { label: 'F Face', moves: ['F', "F'"] },
  { label: 'B Face', moves: ['B', "B'"] },
  { label: 'M Slice', moves: ['M', "M'"] },
  { label: 'E Slice', moves: ['E', "E'"] },
  { label: 'S Slice', moves: ['S', "S'"] },
];

export const KEY_MAP = {
  u: 'U', U: "U'",
  d: 'D', D: "D'",
  r: 'R', R: "R'",
  l: 'L', L: "L'",
  f: 'F', F: "F'",
  b: 'B', B: "B'",
  m: 'M', M: "M'",
  e: 'E', E: "E'",
  s: 'S', S: "S'",
};

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

export const QUICK_ALGORITHMS = [
  { name: 'Sexy Move', moves: ['R', 'U', "R'", "U'"] },
  { name: 'F2L Insert', moves: ['U', 'R', "U'", "R'"] },
  { name: 'OLL (Sune)', moves: ['R', 'U', "R'", 'U', 'R', 'U2', "R'"] },
  { name: 'PLL (U-Perm)', moves: ['R', "U'", 'R', 'U', 'R', 'U', 'R', "U'", "R'", "U'", 'R2'] },
  { name: 'T-Perm', moves: ['R', 'U', "R'", "U'", "R'", 'F', 'R2', "U'", "R'", "U'", 'R', 'U', "R'", "F'"] },
];

export function generateScramble(length = 20) {
  const result = [];
  let last = '';

  for (let index = 0; index < length; index += 1) {
    let move;
    do {
      move = SCRAMBLE_MOVES[Math.floor(Math.random() * SCRAMBLE_MOVES.length)];
    } while (move.replace("'", '') === last.replace("'", ''));

    result.push(move);
    last = move;
  }

  return result;
}

export function formatTime(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centis = Math.floor((ms % 1000) / 10);
  return `${minutes > 0 ? `${minutes}:` : ''}${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}
