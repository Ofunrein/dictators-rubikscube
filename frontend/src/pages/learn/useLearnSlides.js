import { useState, useRef, useEffect } from 'react';

export function useLearnSlides(totalSlides) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const slidesRef = useRef([]);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const goToSlide = (index) => {
    if (index < 0 || index >= totalSlides || index === currentSlide || isTransitioning) return;

    setIsTransitioning(true);
    setCurrentSlide(index);

    if (slidesRef.current[index]) {
      slidesRef.current[index].scrollTop = 0;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsTransitioning(false), 750);
  };

  const nextSlide = () => goToSlide(currentSlide + 1);
  const prevSlide = () => goToSlide(currentSlide - 1);

  return { currentSlide, isTransitioning, slidesRef, goToSlide, nextSlide, prevSlide };
}
