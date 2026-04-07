import {
  applyMoveRemote,
  fetchSolvedState,
  generateScrambleRemote,
  pingBackend
} from '../net/api.js';
import { initKeyboardControls } from './keyboardControls';
import { initKeyboardMouseControls } from './keyboardMouseControls';

/**
 * Central move manager
 * All controls (keyboard, buttons, etc.) will dispatch moves through this module
 * No control methods should directly manipulate cube state or call renderer
 * 
 * @param {string} move - Move to apply (e.g. 'U', 'R'', etc.)
 * @param {object} cubeState - Object with getState and setState methods
 */

function syncRenderedState(cubeState) {
  if (typeof window.setCubeState === 'function') {
    window.setCubeState(cubeState.getState());
  }
}

export async function dispatchMove(move, cubeState) {
  const response = await applyMoveRemote(cubeState.getState(), move);
  cubeState.setState(response.state);
  syncRenderedState(cubeState);
}

function isSolvedState(state) {
  const faces = ['U', 'R', 'F', 'D', 'L', 'B'];
  return faces.every((face) => state[face].every((sticker) => sticker === state[face][0]));
}

function setApiStatus(apiStatusText, message, isError = false) {
  apiStatusText.textContent = message;
  apiStatusText.dataset.error = isError ? 'true' : 'false';
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
    <p id="api-status" data-error="false">API: Connecting...</p>
    <p id="status-text">Status: Solved</p>
    <p id="move-count">Moves: 0</p>
    <p id="scramble-seq">Scramble: none</p>
  `;
  document.body.appendChild(panel);
  return panel;
}

/**
 * Initialize all controls and event listeners.
 *
 * @param {object} cubeState
 * @param {object} options - enables/disables specific control types
 * @param {boolean} [options.keyboard=true] - Enable keyboard controls
 * @param {boolean} [options.mkb=false] - Enable mouse+keyboard controls
 * @param {object} camera
 * @param {object} domElement
 * @param {object} stickerMap
 * @param {object} scene
 */
export function initControls(cubeState, options = {}, camera, domElement, stickerMap, scene) {
  const { keyboard = true, mkb = false } = options;
  const panel = createOrGetPracticePanel();
  const scrambleButton = panel.querySelector('#scramble-btn');
  const resetButton = panel.querySelector('#reset-btn');
  const apiStatusText = panel.querySelector('#api-status');
  const statusText = panel.querySelector('#status-text');
  const moveCountText = panel.querySelector('#move-count');
  const scrambleText = panel.querySelector('#scramble-seq');

  let moveCount = 0;
  let actionQueue = Promise.resolve();
  let pendingActions = 0;

  const refreshStatus = () => {
    const solved = isSolvedState(cubeState.getState());
    statusText.textContent = solved ? 'Status: Solved' : 'Status: In Progress';
    statusText.dataset.solved = solved ? 'true' : 'false';
    moveCountText.textContent = `Moves: ${moveCount}`;
  };

  const setPendingState = (isPending) => {
    scrambleButton.disabled = isPending;
    resetButton.disabled = isPending;
    panel.dataset.busy = isPending ? 'true' : 'false';
  };

  const queueAction = (action) => {
    actionQueue = actionQueue.then(async () => {
      pendingActions += 1;
      setPendingState(true);

      try {
        await action();
        setApiStatus(apiStatusText, 'API: Connected');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed.';
        setApiStatus(apiStatusText, `API: ${message}`, true);
      } finally {
        pendingActions -= 1;
        setPendingState(pendingActions > 0);
        refreshStatus();
      }
    });
  };

  const queueMove = (move, stateRef) => {
    const nextStateRef = stateRef ?? cubeState;
    queueAction(async () => {
      await dispatchMove(move, nextStateRef);
      moveCount += 1;
    });
  };

  if (keyboard) {
    initKeyboardControls(cubeState, queueMove);
  }

  if (mkb && camera && domElement && stickerMap && scene) {
    initKeyboardMouseControls(cubeState, queueMove, camera, domElement, stickerMap, scene);
  }

  scrambleButton.addEventListener('click', () => {
    queueAction(async () => {
      const response = await generateScrambleRemote();
      cubeState.setState(response.state);
      syncRenderedState(cubeState);
      moveCount = 0;
      scrambleText.textContent = `Scramble: ${response.scramble.join(' ')}`;
    });
  });

  resetButton.addEventListener('click', () => {
    queueAction(async () => {
      const solvedState = await fetchSolvedState();
      cubeState.setState(solvedState);
      syncRenderedState(cubeState);
      moveCount = 0;
      scrambleText.textContent = 'Scramble: none';
    });
  });

  queueAction(async () => {
    await pingBackend();
    const solvedState = await fetchSolvedState();
    cubeState.setState(solvedState);
    syncRenderedState(cubeState);
    moveCount = 0;
    scrambleText.textContent = 'Scramble: none';
  });

  refreshStatus();
}
