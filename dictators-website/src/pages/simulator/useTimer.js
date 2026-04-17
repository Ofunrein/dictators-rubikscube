/**
 * useTimer.js — React hook for the solve timer
 *
 * This is a custom React "hook" (a reusable piece of logic that any component can use).
 * If you have never seen React hooks before: a hook is just a function that starts with
 * "use" and lets you plug into React features like state and side effects.
 *
 * What this hook does:
 *   1. Keeps a running clock that updates every 10 milliseconds.
 *   2. Supports the simulator's manual Start/Stop timer button in the left panel.
 *   3. Automatically stops the timer when the cube is solved (isSolved becomes true).
 *   4. Still keeps a legacy "best time" value in localStorage for future profile/history work,
 *      even though the Sprint 3 sidebar no longer renders best-time UI.
 *
 * How SimulatorPage uses it:
 *   const { timerMs, timerRunning, startFreshTimer, stopTimer, resetTimer, toggleTimer }
 *     = useTimer({ isSolved });
 *
 *   - startFreshTimer()  → resets to 0 and starts counting (called on first move after scramble)
 *   - stopTimer()        → pauses and optionally records the legacy best-time value
 *   - resetTimer()       → stops and clears to 0:00.00
 *   - toggleTimer()      → manual start/stop via the timer button in the left panel
 *   - timerMs            → current elapsed time in milliseconds (drives the display)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// localStorage key — changing this string would reset everyone's best time.
const BEST_TIME_STORAGE_KEY = 'rubiks_best_time_ms';

export function useTimer({ isSolved }) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(0);
  const [bestTime, setBestTime] = useState(() => {
    if (typeof window === 'undefined') return null;

    const stored = window.localStorage.getItem(BEST_TIME_STORAGE_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerMsRef = useRef(0);

  useEffect(() => {
    timerMsRef.current = timerMs;
  }, [timerMs]);

  const clearTicker = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const persistBestTime = useCallback((candidate) => {
    if (candidate <= 0) return;

    setBestTime((previousBest) => {
      const nextBest =
        previousBest === null || candidate < previousBest ? candidate : previousBest;

      if (nextBest !== previousBest && typeof window !== 'undefined') {
        window.localStorage.setItem(BEST_TIME_STORAGE_KEY, String(nextBest));
      }

      return nextBest;
    });
  }, []);

  const startTicker = useCallback((offsetMs) => {
    clearTicker();
    startTimeRef.current = Date.now() - offsetMs;
    timerRef.current = window.setInterval(() => {
      setTimerMs(Date.now() - startTimeRef.current);
    }, 10);
    setTimerRunning(true);
  }, [clearTicker]);

  const startTimer = useCallback(() => {
    if (timerRunning) return;
    startTicker(timerMs);
  }, [startTicker, timerMs, timerRunning]);

  const startFreshTimer = useCallback(() => {
    setTimerMs(0);
    startTicker(0);
  }, [startTicker]);

  const stopTimer = useCallback(({ record = true } = {}) => {
    clearTicker();
    setTimerRunning(false);

    if (record) {
      persistBestTime(timerMsRef.current);
    }
  }, [clearTicker, persistBestTime]);

  const resetTimer = useCallback(() => {
    clearTicker();
    startTimeRef.current = null;
    setTimerRunning(false);
    setTimerMs(0);
  }, [clearTicker]);

  const toggleTimer = useCallback(() => {
    if (timerRunning) {
      stopTimer();
      return;
    }

    startTimer();
  }, [startTimer, stopTimer, timerRunning]);

  useEffect(() => {
    if (!timerRunning || !isSolved) return;
    // Make the auto-stop call explicit so the timer is recorded the same way
    // whether the user stops it manually or the cube reaches solved state.
    stopTimer({ record: true });
  }, [isSolved, stopTimer, timerRunning]);

  useEffect(() => () => {
    clearTicker();
  }, [clearTicker]);

  return {
    bestTime,
    resetTimer,
    startFreshTimer,
    stopTimer,
    timerMs,
    timerRunning,
    toggleTimer,
  };
}
