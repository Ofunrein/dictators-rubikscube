const KEY_TO_DIRECTION = {
    ArrowUp: 'U',
    ArrowDown: 'D',
    ArrowLeft: 'L',
    ArrowRight: 'R',
}

/**
 * Initiliaze mouse (select) and keyboard (move) controls
 * 
 * @param {object} cubeState - Passed to dispatchMove
 * @param {function} dispatchMove - Central handler from controls.js
 */

export function initKeyboardMouseControls(cubeState, dispatchMove) {
    console.log('[keyboardMouseControls] initKeyboardMouseControls called - setting up keyboard & mouse event listener');

    return function cleanup() {
        window.removeEventListener
        console.log('[keyboardMouseControls] Keyboard & Mouse event listener removed');
    };
}