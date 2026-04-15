import { createSection } from './panel.js';
import { generateScrambleRemote, fetchSolvedState } from '../net/api.js';
import { onceOnFirstMove } from './controls/controls.js';

const POLL_INTERVAL_MS = 500;
const BEST_TIME_KEY = 'rubiks_best_time_ms';

export function initStopwatch(container, context) {
    const { cubeState } = context;
    const section = createSection('Stopwatch');

    let startTime = null;
    let intervalId = null;
    let pollId = null;

    // Load persisted best time
    let bestTimeMs = parseInt(localStorage.getItem(BEST_TIME_KEY) || '0', 10) || null;

    const display = document.createElement('div');
    display.textContent = '0:00.00';

    const bestDisplay = document.createElement('div');
    bestDisplay.style.fontSize = '0.85em';
    bestDisplay.style.opacity = '0.7';
    bestDisplay.textContent = bestTimeMs ? `Best: ${formatTime(bestTimeMs)}` : 'Best: --';

    const statusLabel = document.createElement('div');
    statusLabel.textContent = 'Idle';

    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start Challenge';

    const stopBtn = document.createElement('button');
    stopBtn.textContent = 'Stop';
    stopBtn.style.display = 'none';

    function formatTime(ms) {
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

    function saveBestTime(ms) {
        if (!bestTimeMs || ms < bestTimeMs) {
            bestTimeMs = ms;
            localStorage.setItem(BEST_TIME_KEY, String(ms));
            bestDisplay.textContent = `Best: ${formatTime(ms)}`;
        }
    }

    function reset() {
        stopTimer();
        stopPolling();
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
                    const elapsed = performance.now() - startTime;
                    stopTimer();
                    stopPolling();
                    saveBestTime(elapsed);
                    statusLabel.textContent = `Solved! ${formatTime(elapsed)}`;
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
        statusLabel.textContent = 'Scrambling...';

        try {
            const { state, scramble } = await generateScrambleRemote();
            cubeState.setState(state);
            window.setCubeState(state);
            // Store scramble on context so the Solve button can use it
            context.scrambleMoves = scramble;

            // Timer starts on the user's FIRST move, not immediately
            statusLabel.textContent = 'Make a move to start!';
            onceOnFirstMove(() => {
                statusLabel.textContent = 'Solving...';
                startTimer();
                startPolling();
            });
        } catch (err) {
            console.error('[stopwatch] Scramble failed:', err);
            reset();
        }
    };

    stopBtn.onclick = () => reset();

    section.appendChild(display);
    section.appendChild(bestDisplay);
    section.appendChild(statusLabel);
    section.appendChild(startBtn);
    section.appendChild(stopBtn);
    container.appendChild(section);
}