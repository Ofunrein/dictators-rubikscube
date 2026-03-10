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
   * @returns {Function} cleanup - Called to remove event listener
   */

export function initKeyboardControls(cubeState, dispatchMove) {
    function handleKeyDown(event) {
        const key = event.key.toUpperCase();
        let move = KEY_TO_MOVE[key];
        if (!move) {
            return; // Not a valid move key
        }

        if (event.shiftKey || event.altKey) {
            move = move.endsWith("'") ? move.slice(0, -1) : move + "'";
        }

        dispatchMove(move, cubeState);
    }

    window.addEventListener('keydown', handleKeyDown);

    return function cleanup() {
        window.removeEventListener('keydown', handleKeyDown);
    };
}
