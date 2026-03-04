import {MOVES, applyMove} from '../cube/moves'

/**
 * Initialize UI input controls (keyboard/touch).
 * Implementation is staged for a later sprint.
 */

export function initControls(cubeState) {

  console.log('[conrtrols] initControls called - setting up event listeners');

const keyToMove = {
  U: 'U',
  D: 'D',
  L: 'L',
  R: 'R',
  F: 'F',
  B: 'B',
};

window.addEventListener('keydown', (event) => {
  console.log(`[controls] keydown event: ${event.key}, modifiers - shift: ${event.shiftKey}, alt: ${event.altKey}`);

  const key = event.key.toUpperCase()
  let move = keyToMove[key];
  if(!move) {
    console.log(`[controls] Invalid move key: ${event.key}`);
    return; // Not a valid move key
  } 

  // Reverse rotation if modifier keys are held
  if(event.shiftKey || event.altKey) {
    move = move.endsWith("'") ? move.slice(0, -1) : move + "'";
    console.log(`[controls] Modifier key detected - applying reverse move: ${move}`);
  }

  console.log(`[controls] Applying move: ${move}`);

  // Apply the move to the current cube state and update
  const newState = applyMove(cubeState.getState(), move);
  cubeState.setState(newState);

  console.log(`[controls] Move applied. New state: ${JSON.stringify(cubeState.getState())}`);

  if(typeof window.setCubeState !== 'function') {
    console.error('[controls] window.setCubeState is NOT a function - renderer hook is missing');
  }

  // Update renderer with new state
  window.setCubeState(cubeState.getState());
  console.log('[controls] window.setCubeState called to update renderer successfully');
});
}
