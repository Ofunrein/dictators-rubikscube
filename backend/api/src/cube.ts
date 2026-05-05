import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const apiSrcDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(apiSrcDir, '../../..');
const frontendMovesCandidates = [
  resolve(repoRoot, 'dictators-website/src/cube/moves.js'),
  resolve(repoRoot, 'dicators-website/src/cube/moves.js'),
  resolve(repoRoot, 'frontend/src/cube/moves.js'),
];

let frontendMovesModule: { applyMove: (state: CubeState, move: string) => CubeState; MOVES: string[] } | null = null;
for (const candidate of frontendMovesCandidates) {
  if (!existsSync(candidate)) {
    continue;
  }

  frontendMovesModule = await import(pathToFileURL(candidate).href) as {
    applyMove: (state: CubeState, move: string) => CubeState;
    MOVES: string[];
  };
  break;
}

if (!frontendMovesModule) {
  throw new Error(`Unable to find frontend moves module. Checked: ${frontendMovesCandidates.join(', ')}`);
}

const { applyMove: applyFrontendMove, MOVES: FRONTEND_MOVES } = frontendMovesModule;

export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export const STICKER_TOKENS = ['W', 'R', 'G', 'Y', 'O', 'B'] as const;
export const MOVE_TOKENS = [...FRONTEND_MOVES];

const FACE_SET = new Set(FACE_ORDER);
const TOKEN_SET = new Set(STICKER_TOKENS);
const MOVE_SET = new Set(MOVE_TOKENS);

export type CubeFaceName = (typeof FACE_ORDER)[number];
export type StickerToken = (typeof STICKER_TOKENS)[number];
export type CubeState = Record<CubeFaceName, string[]>;

export function isSupportedMove(move: string): boolean {
  return MOVE_SET.has(move);
}

export function isStickerToken(value: unknown): value is StickerToken {
  return typeof value === 'string' && TOKEN_SET.has(value as StickerToken);
}

export function isCubeFace(face: unknown): face is CubeFaceName {
  return typeof face === 'string' && FACE_SET.has(face as CubeFaceName);
}

export function createSolvedState(): CubeState {
  return {
    U: Array(9).fill('W'),
    R: Array(9).fill('R'),
    F: Array(9).fill('G'),
    D: Array(9).fill('Y'),
    L: Array(9).fill('O'),
    B: Array(9).fill('B'),
  };
}

export function cloneCubeState(state: CubeState): CubeState {
  return FACE_ORDER.reduce((accumulator, face) => {
    accumulator[face] = [...state[face]];
    return accumulator;
  }, {} as CubeState);
}

export function applyMoveToState(state: CubeState, move: string): CubeState {
  return applyFrontendMove(cloneCubeState(state), move);
}

export function applyMoves(initialState: CubeState, moves: string[]): CubeState {
  return moves.reduce((state, move) => applyMoveToState(state, move), cloneCubeState(initialState));
}

export function getMoveFace(move: string): string {
  return move.replace("'", '');
}

function createSeededRng(seed: number): () => number {
  let current = seed >>> 0;
  return () => {
    current = (1664525 * current + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

export function generateScramble(length = 25, seed?: number): string[] {
  const random = typeof seed === 'number' && Number.isInteger(seed) ? createSeededRng(seed) : Math.random;
  const scramble: string[] = [];

  while (scramble.length < length) {
    const next = MOVE_TOKENS[Math.floor(random() * MOVE_TOKENS.length)];
    if (scramble.length === 0) {
      scramble.push(next);
      continue;
    }

    const previous = scramble[scramble.length - 1];
    if (getMoveFace(previous) === getMoveFace(next)) {
      continue;
    }

    scramble.push(next);
  }

  return scramble;
}
