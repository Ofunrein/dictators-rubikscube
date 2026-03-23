const KEY_TO_MOVE = {
    U: 'U',
    D: 'D',
    L: 'L',
    R: 'R',
    F: 'F',
    B: 'B',
  };

  /**
   * Initialize keyboard controls for the cube.
   * 
   * @param {object} cubeState - Passed to dispatchMove
   * @param {Function} dispatchMove - Central handler from controls.js
   */
  export function initKeyboardControls(cubeState, dispatchMove) {
    console.log('[keyboardControls] initKeyboardControls called - setting up keyboard event listener');

    function handleKeyDown(event) {
        console.log(`[keyboardControls] keydown event: ${event.key}, modifiers - shift: ${event.shiftKey}, alt: ${event.altKey}`);

        const key = event.key.toUpperCase();
        let move = KEY_TO_MOVE[key];
        if (!move) {
            console.log(`[keyboardControls] Invalid move key: ${event.key}`);
            return; // Not a valid move key
        }

        if (event.shiftKey || event.altKey) {
            move = move.endsWith("'") ? move.slice(0, -1) : move + "'";
            console.log(`[keyboardControls] Modifier key detected - applying reverse move: ${move}`);
        }

        dispatchMove(move, cubeState);
    }

    window.addEventListener('keydown', handleKeyDown);

    // Returns cleanup funxction so event listeners are detached when this control scheme is terminated/switched
    return function cleanup() {
        window.removeEventListener
        console.log('[keyboardControls] Keyboard event listener removed');
    };
}
