/**
 * useTimer.js — React hook for the solve timer
 *
 * This is a custom React "hook" (a reusable piece of logic that any component can use).
 * If you have never seen React hooks before: a hook is just a function that starts with
 * "use" and lets you plug into React features like state and side effects.
 *
 * What this hook does:
 *   1. Keeps a running clock that updates every 10 milliseconds.
 *   2. Lets SimulatorPage start a fresh timed solve after it has queued a scramble.
 *   3. Automatically stops the timer when the cube is solved (isSolved becomes true).
 *   4. Preserves the most recent solve time in the display until the page resets it.
 *
 * How SimulatorPage uses it:
 *   const { timerMs, timerRunning, startFreshTimer, stopTimer, resetTimer }
 *     = useTimer({ isSolved });
 *
 *   - startFreshTimer()  → resets to 0 and starts counting (called on first move after scramble)
 *   - stopTimer()        → pauses and can optionally clear the elapsed display
 *   - resetTimer()       → stops and clears to 0:00.00
 *   - timerMs            → current elapsed time in milliseconds (drives the display)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useTimer({ isSolved }) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(0);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const clearTicker = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTicker = useCallback((offsetMs) => {
    clearTicker();
    startTimeRef.current = Date.now() - offsetMs;

    const tick = () => {
      setTimerMs(Date.now() - startTimeRef.current);
      timerRef.current = requestAnimationFrame(tick);
    };

    timerRef.current = requestAnimationFrame(tick);
    setTimerRunning(true);
  }, [clearTicker]);

  const startFreshTimer = useCallback(() => {
    setTimerMs(0);
    startTicker(0);
  }, [startTicker]);

  const stopTimer = useCallback(({ clearElapsed = false } = {}) => {
    clearTicker();
    startTimeRef.current = null;
    setTimerRunning(false);

    if (clearElapsed) {
      setTimerMs(0);
    }
  }, [clearTicker]);

  const resetTimer = useCallback(() => {
    stopTimer({ clearElapsed: true });
  }, [stopTimer]);

  useEffect(() => {
    if (!timerRunning || !isSolved) return;
    const timeoutId = window.setTimeout(() => {
      stopTimer();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isSolved, stopTimer, timerRunning]);

  useEffect(() => () => {
    clearTicker();
  }, [clearTicker]);

  return {
    resetTimer,
    startFreshTimer,
    stopTimer,
    timerMs,
    timerRunning,
  };
}
