/**
 * useLearnSlides.ts — Slide navigation state for the Learn page
 *
 * Manages the current slide index and transition animation state so that
 * LearnPage can navigate between slides without duplicating this logic in
 * the page component itself.
 *
 * Key exports:
 *   - useLearnSlides(totalSlides) — returns { currentSlide, goToSlide,
 *     goNext, goPrev, isTransitioning, slidesRef }
 *
 * Prevents rapid double-transitions by locking navigation while
 * isTransitioning is true and clearing any pending timeout on unmount.
 */
import { useState, useRef, useEffect } from 'react';

export function useLearnSlides(totalSlides: number) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const slidesRef = useRef<(HTMLElement | null)[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const goToSlide = (index: number) => {
    if (index < 0 || index >= totalSlides || index === currentSlide || isTransitioning) return;

    setIsTransitioning(true);
    setCurrentSlide(index);

    const el = slidesRef.current[index];
    if (el) {
      el.scrollTop = 0;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsTransitioning(false), 750);
  };

  const nextSlide = () => goToSlide(currentSlide + 1);
  const prevSlide = () => goToSlide(currentSlide - 1);

  return { currentSlide, isTransitioning, slidesRef, goToSlide, nextSlide, prevSlide };
}
