import {MOVES, applyMove} from '../cube/moves'

/**
 * Initialize UI input controls (keyboard/touch).
 * Implementation is staged for a later sprint.
 */

export function initControls() {
window.addEventListener('keydown', (event) => {
  const move = MOVES[event.code.toUpperCase()];
  if(!move) return; // Not a valid move key

  if(event.shiftKey || event.altKey || event.ctrlKey) {
    // Reverse rotation if modifier keys are held
    move = move.endsWith("'") ? move.slice(0, -1) : move + "'";
  }

  // Apply the move to the current cube state and update
  const newState = applyMove(CubeState.getState(), move);
  CubeState.setCubeState(newState);

  // Update renderer with new state
  window.setCubeState(CubeState.getState);
});
}
