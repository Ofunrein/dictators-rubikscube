import {applyMove} from '../../cube/moves'
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

let cleanupFn = null; // Store cleanup function for current controls to detach event listeners when switching controls


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
 * @param {string} method - enables/disables specific control types (e.g. { keyboard: true, mkb: false })
 * @param {object} context - Additional context (e.g. camera, cubeState) for controls that need it
 */

export function initControls(method, context) {
  console.log('[controls] initControls called with method:', method);

  // Cleanup old control listeners if they exist before initializing new ones
  if(cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }

  const { cubeState, camera, renderer, stickerMap, scene } = context;

  if (method === "key") {
    cleanupFn =initKeyboardControls(cubeState, dispatchMove);
    console.log('[controls] Keyboard controls initialized');
  }
  else if (method === "mkb") {
    cleanupFn = initKeyboardMouseControls(
      cubeState,
      dispatchMove,
      camera,
      renderer?.domElement,
      stickerMap,
      scene
    );
    console.log('[controls] Mouse/Keyboard hybrid controls initialized');
  }
  else {
    console.error(`[controls] Unknown control method: ${method}`);
  }
}
