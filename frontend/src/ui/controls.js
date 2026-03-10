import { CubeState } from '../cube/CubeState';
import { MOVES, applyMove } from '../cube/moves';
import { initKeyboardControls } from './keyboardControls';

/**
 * Central move manager
 * All controls (keyboard, buttons, etc.) will dispatch moves through this module
 * No control methods should directly manipulate cube state or call renderer
 * 
 * @param {string} move - Move to apply (e.g. 'U', 'R'', etc.)
 * @param {object} cubeState - Object with getState and setState methods
 */

export function dispatchMove(move, cubeState) {
  const newState = applyMove(cubeState.getState(), move);
  cubeState.setState(newState);

  if (typeof window.setCubeState !== 'function') {
    return;
  }

  window.setCubeState(cubeState.getState());
}

function isSolvedState(state) {
  const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
  return faces.every((face) => state[face].every((sticker) => sticker === state[face][0]));
}

function getMoveFace(move) {
  return move.replace("'", '');
}

function generateScramble(length = 25) {
  const scramble = [];

  while (scramble.length < length) {
    const next = MOVES[Math.floor(Math.random() * MOVES.length)];
    if (scramble.length === 0) {
      scramble.push(next);
      continue;
    }

    const prev = scramble[scramble.length - 1];
    if (getMoveFace(prev) === getMoveFace(next)) {
      continue;
    }

    scramble.push(next);
  }

  return scramble;
}

function applySequence(cubeState, moves) {
  let nextState = cubeState.getState();
  for (const move of moves) {
    nextState = applyMove(nextState, move);
  }
  cubeState.setState(nextState);
  if (typeof window.setCubeState === 'function') {
    window.setCubeState(cubeState.getState());
  }
}

function createOrGetPracticePanel() {
  const existing = document.getElementById('practice-panel');
  if (existing) {
    return existing;
  }

  const panel = document.createElement('section');
  panel.id = 'practice-panel';
  panel.innerHTML = `
    <h2>Practice</h2>
    <p class="hint">Keys: U D L R F B (hold Shift for inverse)</p>
    <div class="buttons">
      <button id="scramble-btn" type="button">Scramble</button>
      <button id="reset-btn" type="button">Reset</button>
    </div>
    <p id="status-text">Status: Solved</p>
    <p id="move-count">Moves: 0</p>
    <p id="scramble-seq">Scramble: none</p>
  `;
  document.body.appendChild(panel);
  return panel;
}

/**
 * Initialize all controls and event listeners
 * 
 * @param {object} cubeState
 * @param {object} options - enables/disables specific control types (e.g. { keyboard: true, mkb: false })
 * @param {boolean} [options.keyboard=true] - Enable keyboard controls
 * @param {boolean} [options.mkb=false] - not yet implemented - placeholder for mouse/keyboard hybrid controls
 */

export function initControls(cubeState, options = {}) {
  const { keyboard = true } = options;
  const panel = createOrGetPracticePanel();
  const scrambleButton = panel.querySelector('#scramble-btn');
  const resetButton = panel.querySelector('#reset-btn');
  const statusText = panel.querySelector('#status-text');
  const moveCountText = panel.querySelector('#move-count');
  const scrambleText = panel.querySelector('#scramble-seq');

  let moveCount = 0;

  const refreshStatus = () => {
    const solved = isSolvedState(cubeState.getState());
    statusText.textContent = solved ? 'Status: Solved' : 'Status: In Progress';
    statusText.dataset.solved = solved ? 'true' : 'false';
    moveCountText.textContent = `Moves: ${moveCount}`;
  };

  if (keyboard) {
    initKeyboardControls(cubeState, (move, stateRef) => {
      dispatchMove(move, stateRef);
      moveCount += 1;
      refreshStatus();
    });
  }

  scrambleButton.addEventListener('click', () => {
    const scramble = generateScramble();
    applySequence(cubeState, scramble);
    moveCount = 0;
    scrambleText.textContent = `Scramble: ${scramble.join(' ')}`;
    refreshStatus();
  });

  resetButton.addEventListener('click', () => {
    cubeState.setState(CubeState.createSolvedState());
    if (typeof window.setCubeState === 'function') {
      window.setCubeState(cubeState.getState());
    }
    moveCount = 0;
    scrambleText.textContent = 'Scramble: none';
    refreshStatus();
  });

  refreshStatus();
}
