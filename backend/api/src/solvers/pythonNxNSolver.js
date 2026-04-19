/**
 * pythonNxNSolver.js — Bootstrap + bridge for the vendored 2x2 / 4x4 solver
 *
 * This file handles the runtime side of the Python solver:
 *   1. BOOTSTRAPS the Python environment on first use (virtualenv, pip, C compilation)
 *   2. RUNS the bridge script as a child process and parses the JSON result
 *
 * The notation translation (sticker tokens, move formats) lives in pythonNotation.js.
 * This file just does the process management and result packaging.
 *
 * The bootstrap is lazy — it only runs on the first solve request and caches
 * the result. A .solver-ready stamp file prevents re-running across server restarts.
 */

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { createSolvedState, getFaceSize, normalizeCubeSize } from '../cube.js';
import {
  convertCanonicalMoveToSolver,
  flattenStateForSolver,
  normalizeSolverMoves,
  unflattenStateFromSolver,
} from './pythonNotation.js';

const execFileAsync = promisify(execFile);

// Path constants for the vendored Python solver and its environment
const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '..', '..', '..', '..');
const vendorRoot = resolve(repoRoot, 'backend/vendor/rubiks-cube-NxNxN-solver');
const venvDir = resolve(vendorRoot, '.venv');
const pythonBin = resolve(venvDir, 'bin/python3');
const bridgeScript = resolve(moduleDir, 'nxn_solver_bridge.py');
const bootstrapStamp = resolve(venvDir, '.solver-ready');
const idaBinary = resolve(vendorRoot, 'ida_search_via_graph');

let bootstrapPromise = null;

function formatCommandError(error, context) {
  const stderr = error?.stderr?.toString?.().trim?.();
  const stdout = error?.stdout?.toString?.().trim?.();
  const detail = stderr || stdout || error?.message || 'Unknown command failure.';
  return new Error(`${context}: ${detail}`);
}

async function runFile(command, args, context) {
  try {
    return await execFileAsync(command, args, {
      cwd: vendorRoot,
      env: {
        ...process.env,
        PIP_DISABLE_PIP_VERSION_CHECK: '1',
      },
    });
  } catch (error) {
    throw formatCommandError(error, context);
  }
}

// Lazy bootstrap: creates a Python virtualenv, installs dependencies, and compiles
// the native IDA* search binary. Only runs once — subsequent calls return the
// cached promise. The .solver-ready stamp file prevents re-running across server restarts.
async function ensureBootstrap() {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    if (!existsSync(vendorRoot)) {
      throw new Error('Vendored NxN solver directory is missing.');
    }

    mkdirSync(venvDir, { recursive: true });

    if (!existsSync(pythonBin)) {
      await runFile('python3', ['-m', 'venv', '.venv'], 'Failed to create NxN solver virtualenv');
    }

    if (!existsSync(idaBinary)) {
      await runFile(
        'gcc',
        [
          '-O3',
          '-o',
          'ida_search_via_graph',
          'rubikscubennnsolver/ida_search_core.c',
          'rubikscubennnsolver/rotate_xxx.c',
          'rubikscubennnsolver/ida_search_666.c',
          'rubikscubennnsolver/ida_search_777.c',
          'rubikscubennnsolver/ida_search_via_graph.c',
          '-lm',
        ],
        'Failed to compile ida_search_via_graph',
      );
    }

    if (!existsSync(bootstrapStamp)) {
      await runFile(
        pythonBin,
        ['-m', 'pip', 'install', '--upgrade', 'pip'],
        'Failed to upgrade pip for the NxN solver',
      );
      await runFile(
        pythonBin,
        ['-m', 'pip', 'install', 'kociemba'],
        'Failed to install the NxN solver Python dependency',
      );
      writeFileSync(bootstrapStamp, 'ready\n');
    }
  })();

  return bootstrapPromise;
}

// Runs the Python bridge script with the given mode ('solve' or 'apply'),
// cube size, state, and optional moves. Returns the parsed JSON result.
async function runBridge({ mode = 'solve', size, state, moves = [] }) {
  await ensureBootstrap();

  const normalizedSize = normalizeCubeSize(size);
  const args = [
    bridgeScript,
    '--mode',
    mode,
    '--size',
    String(normalizedSize),
    '--state',
    flattenStateForSolver(state),
  ];

  if (mode === 'apply') {
    args.push(
      '--moves',
      moves.map((move) => convertCanonicalMoveToSolver(move, normalizedSize)).join(' '),
    );
  }

  const { stdout } = await runFile(
    pythonBin,
    args,
    `NxN solver bridge failed in ${mode} mode`,
  );

  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error('NxN solver bridge returned invalid JSON.');
  }
}

// Solves a 2x2 or 4x4 cube using the vendored Python solver.
// Returns { moves, estimatedMoveCount, state, solver } matching the API response shape.
export async function solveCubeStateWithPython(state, size) {
  const normalizedSize = normalizeCubeSize(size);

  if (![2, 4].includes(normalizedSize)) {
    throw new Error(`Python NxN solver only handles 2x2 and 4x4, received ${normalizedSize}.`);
  }

  const payload = await runBridge({ mode: 'solve', size: normalizedSize, state });

  if (!payload?.solved) {
    throw new Error('NxN solver did not finish with a solved cube.');
  }

  const rawMoves = Array.isArray(payload.moves) ? payload.moves : [];
  const replayableMoves = normalizeSolverMoves(rawMoves, normalizedSize);

  return {
    moves: replayableMoves,
    estimatedMoveCount: Number.isInteger(payload.move_count) ? payload.move_count : rawMoves.length,
    state: createSolvedState(normalizedSize),
    solver: `python-nxn-${normalizedSize}`,
  };
}

// Applies moves to a 2x2 or 4x4 state using the Python solver's apply mode.
export async function applyMovesWithPython(state, moves, size = getFaceSize(state)) {
  const normalizedSize = normalizeCubeSize(size);

  if (![2, 4].includes(normalizedSize)) {
    throw new Error(`Python NxN apply helper only handles 2x2 and 4x4, received ${normalizedSize}.`);
  }

  const payload = await runBridge({
    mode: 'apply',
    size: normalizedSize,
    state,
    moves,
  });

  if (typeof payload?.state !== 'string') {
    throw new Error('NxN apply bridge did not return a flattened state.');
  }

  return unflattenStateFromSolver(payload.state, normalizedSize);
}
