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
            const payload = await generateScrambleRemote();
            cubeState.setState(payload.state);
            window.setCubeState(payload.state);
            // Store scramble sequence on context for use by the Solve button
            context.scrambleMoves = payload.scramble;
        } catch (err) {
            console.error('[features] Scramble failed:', err);
        }
    }

    const solveBtn = document.createElement('button');
    solveBtn.textContent = 'Solve';
    solveBtn.onclick = async () => {
        console.log('[features] Solve button clicked');
        try {
            const result = await solveCubeRemote(cubeState.getState(), {
                scrambleMoves: context.scrambleMoves
            });
            console.log('[features] raw result:', JSON.stringify(result));

            if (result.solvedState) {
                cubeState.setState(result.solvedState);
                window.setCubeState(result.solvedState);
            } else if (result.moves && result.moves.length > 0) {
                for (const move of result.moves) {
                    dispatchMove(move, cubeState);
                }
                // Clear the stored scramble after solving
                context.scrambleMoves = null;
            }
        } catch (err) {
            console.error('[features] Solve failed:', err);
        }
    }

    section.appendChild(scrambleBtn);
    section.appendChild(solveBtn);
    container.appendChild(section);
}