import {MOVES, applyMove} from '../cube/moves'
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

export function dispatchMove(move, cubeState) {
  console.log(`[controls] dispatchMove called with move: ${move}`);

  const newState = applyMove(cubeState.getState(), move);
  cubeState.setState(newState);

  console.log(`[controls] Move applied. New state: ${JSON.stringify(cubeState.getState())}`);

  if(typeof window.setCubeState !== 'function') {
    console.error('[controls] window.setCubeState is NOT a function - renderer hook is missing');
    return;
  }

  window.setCubeState(cubeState.getState());
  console.log('[controls] window.setCubeState called to update renderer successfully');
}

/**
 * Initialize all controls and event listeners
 * 
 * @param {object} cubeState
 * @param {object} options - enables/disables specific control types (e.g. { keyboard: true, mkb: false })
 * @param {boolean} [options.keyboard=true] - Enable keyboard controls
 * @param {boolean} [options.mkb=false] - not yet implemented - placeholder for mouse/keyboard hybrid controls
 */

export function initControls(cubeState, options = {}, camera, domElement, StickerMap, scene) {
  const { keyboard = false, mkb = true } = options;
  console.log('[controls] initControls called with options:', options);

  if (keyboard) {
    initKeyboardControls(cubeState, dispatchMove);
    console.log('[controls] Keyboard controls initialized');
  }
  if (mkb) {
    initKeyboardMouseControls(cubeState, dispatchMove, camera, domElement, StickerMap, scene);
    console.log('[controls] Mouse/Keyboard hybrid controls initialized');
  }
}
