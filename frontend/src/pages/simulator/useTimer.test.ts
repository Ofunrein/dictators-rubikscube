import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer } from './useTimer.ts';

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let rafId = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafId += 1;
      setTimeout(() => cb(Date.now()), 16);
      return rafId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts not running with 0ms elapsed', () => {
    const { result } = renderHook(() => useTimer({ isSolved: false }));
    expect(result.current.timerRunning).toBe(false);
    expect(result.current.timerMs).toBe(0);
  });

  it('startFreshTimer begins the timer', () => {
    const { result } = renderHook(() => useTimer({ isSolved: false }));
    act(() => { result.current.startFreshTimer(); });
    expect(result.current.timerRunning).toBe(true);
  });

  it('stopTimer halts the timer', () => {
    const { result } = renderHook(() => useTimer({ isSolved: false }));
    act(() => {
      result.current.startFreshTimer();
      result.current.stopTimer();
    });
    expect(result.current.timerRunning).toBe(false);
  });

  it('resetTimer zeroes elapsed time', () => {
    const { result } = renderHook(() => useTimer({ isSolved: false }));
    act(() => {
      result.current.startFreshTimer();
      vi.advanceTimersByTime(1000);
    });
    act(() => { result.current.resetTimer(); });
    expect(result.current.timerMs).toBe(0);
  });
});
