import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLearnSlides } from './useLearnSlides.js';

describe('useLearnSlides', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts at slide 0', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    expect(result.current.currentSlide).toBe(0);
    expect(result.current.isTransitioning).toBe(false);
  });

  it('goToSlide changes currentSlide', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => result.current.goToSlide(2));
    expect(result.current.currentSlide).toBe(2);
  });

  it('goToSlide sets isTransitioning to true then false after 750ms', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => result.current.goToSlide(1));
    expect(result.current.isTransitioning).toBe(true);
    act(() => vi.advanceTimersByTime(750));
    expect(result.current.isTransitioning).toBe(false);
  });

  it('goToSlide ignores out-of-bounds index', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => result.current.goToSlide(-1));
    expect(result.current.currentSlide).toBe(0);
    act(() => result.current.goToSlide(6));
    expect(result.current.currentSlide).toBe(0);
  });

  it('goToSlide ignores same slide', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => result.current.goToSlide(0));
    expect(result.current.isTransitioning).toBe(false);
  });

  it('nextSlide advances by 1, prevSlide goes back by 1', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => { result.current.nextSlide(); vi.advanceTimersByTime(750); });
    expect(result.current.currentSlide).toBe(1);
    act(() => { result.current.prevSlide(); vi.advanceTimersByTime(750); });
    expect(result.current.currentSlide).toBe(0);
  });

  it('nextSlide does not go past last slide', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => { result.current.goToSlide(5); vi.advanceTimersByTime(750); });
    act(() => result.current.nextSlide());
    expect(result.current.currentSlide).toBe(5);
  });

  it('prevSlide does not go below 0', () => {
    const { result } = renderHook(() => useLearnSlides(6));
    act(() => result.current.prevSlide());
    expect(result.current.currentSlide).toBe(0);
  });
});
