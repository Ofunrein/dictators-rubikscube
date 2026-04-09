import { createSection } from './panel.js';
import { generateScrambleRemote, fetchSolvedState } from '../net/api.js';

const POLL_INTERVAL_MS = 500;

export function initStopwatch(container, context) {
    const { cubeState } = context;
    const section = createSection('Stopwatch');

    let startTime = null;
    let intervalId = null;
    let pollId = null;

    const display = document.createElement('div');
    display.textContent = '0:00.00';

    const statusLabel = document.createElement('div');
    statusLabel.textContent = 'Idle';

    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start Challenge';

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.style.display = 'none';

    function formatTime(ms){
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    }

    function startTimer() {
        startTime = performance.now();
        intervalId = setInterval(() => {
            display.textContent = formatTime(performance.now() - startTime);
        }, 50);
    }

    function stopTimer() {
        clearInterval(intervalId);
        intervalId = null;
    }

    function stopPolling() {
        clearInterval(pollId);
        pollId = null;
    }

    function reset() {
        stopTimer();
        display.textContent = '0:00.00';
        statusLabel.textContent = 'Idle';
        startBtn.style.display = '';
        stopBtn.style.display = 'none';
    }

    function startPolling() {
        pollId = setInterval(async () => {
            try {
                const solvedState = await fetchSolvedState();
                const current = cubeState.getState();

                const isSolved = ['U', 'R', 'F', 'D', 'L', 'B'].every(face =>
                    solvedState[face].every((sticker, i) => sticker === current[face][i])
                );

                if (isSolved) {
                    stopTimer();
                    stopPolling();
                    statusLabel.textContent = 'Solved!';
                    stopBtn.style.display = 'none';
                    startBtn.style.display = '';
                }
            } catch (err) {
                console.error('[stopwatch] Solve detection poll failed:', err);
            }
        }, POLL_INTERVAL_MS);
    }

    startBtn.onclick = async () => {
        startBtn.style.display = 'none';
        stopBtn.style.display = '';
        statusLabel.textContent = 'Scrambling...'

        try {
            //const { state } = await generateScrambleRemote();
            //cubeState.setState(state);
            //window.setCubeState(state);

            statusLabel.textContent = 'Solve it!';
            startTimer();
            startPolling();
        } catch (err) {
            console.error('[stopwatch] Scramble failed:', err);
            reset();
        }
    };

    stopBtn.onclick = () => reset();

    section.appendChild(display);
    section.appendChild(statusLabel);
    section.appendChild(startBtn);
    section.appendChild(stopBtn);
    container.appendChild(section);
}