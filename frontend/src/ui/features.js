import { createSection } from './panel.js';
import { generateScrambleRemote, solveCubeRemote } from '../net/api.js';
import { dispatchMove } from './controls/controls.js';

export function initFeatures(container, context){
    const { cubeState } = context;
    const section = createSection('Functions');

    const scrambleBtn = document.createElement('button');
    scrambleBtn.textContent = 'Scramble';
    scrambleBtn.onclick = async () => {
        try {
            const { state } = await generateScrambleRemote();
            cubeState.setState(state);
            window.setCubeState(state);
        } catch (err) {
            console.error('[features] Scramble failed:', err);
        }
    }

    const solveBtn = document.createElement('button');
    solveBtn.textContent = 'Solve';
    solveBtn.onclick = async () => {
    console.log('[features] Solve button clicked');
    try {
        const result = await solveCubeRemote(cubeState.getState());
        console.log('[features] raw result:', JSON.stringify(result));

        if (result.solvedState) {
            cubeState.setState(result.solvedState);
            window.setCubeState(result.solvedState);
        } else if (result.moves && result.moves.length > 0) {
            for (const move of result.moves) {
                dispatchMove(move, cubeState);
            }
        } else {
            console.error('[features] Solve failed:', err);
            console.error('[features] Solve error details:', err.message, err.stack);
        }
    } catch (err) {
        console.error('[features] Solve failed:', err);
    }
}

    section.appendChild(scrambleBtn);
    section.appendChild(solveBtn);
    container.appendChild(section);
}