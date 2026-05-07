/**
 * useTimer.ts — React hook for the solve timer
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseTimerProps {
  isSolved: boolean;
}

export function useTimer({ isSolved }: UseTimerProps) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMs, setTimerMs] = useState(0);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const clearTicker = useCallback(() => {
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTicker = useCallback((offsetMs: number) => {
    clearTicker();
    startTimeRef.current = Date.now() - offsetMs;

    const tick = () => {
      setTimerMs(Date.now() - startTimeRef.current!);
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
