import { useCallback, useEffect, useRef, useState } from 'react';

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
      persistBestTime(timerMs);
    }
  }, [clearTicker, persistBestTime, timerMs]);

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
    stopTimer();
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
