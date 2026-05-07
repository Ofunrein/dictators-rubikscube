import { useState, useEffect, useCallback } from 'react';

import PageNavbar from '../components/PageNavbar';
import { useTheme } from '../context/ThemeContext';
import { useLearnSlides } from './learn/useLearnSlides.js';
import SlideHero from './learn/SlideHero.jsx';
import SlideOverview from './learn/SlideOverview.jsx';
import SlideNotation from './learn/SlideNotation.jsx';
import SlideStepByStep from './learn/SlideStepByStep.jsx';
import SlideAlgorithms from './learn/SlideAlgorithms.jsx';
import SlideResources from './learn/SlideResources.jsx';
import './learn/LearnPage.css';

const TOTAL_SLIDES = 6;

export default function LearnPage() {
  const { isDark } = useTheme();
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const { currentSlide, isTransitioning, slidesRef, goToSlide, nextSlide, prevSlide } =
    useLearnSlides(TOTAL_SLIDES);

  const theme = {
    bg: isDark ? '#0a0a0a' : '#ffffff',
    text: isDark ? '#f5f5f5' : '#1a1a1a',
  };

  const showToastMessage = useCallback((msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, []);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(
      () => showToastMessage(`Copied: ${text}`),
      () => showToastMessage('Copy failed'),
    );
  }, [showToastMessage]);

  useEffect(() => {
    let touchStartX = 0;
    const onTouchStart = (e) => { touchStartX = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) { if (dx < 0) nextSlide(); else prevSlide(); }
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [nextSlide, prevSlide]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextSlide, prevSlide]);

  const slides = [
    <SlideHero key={0} onStart={() => goToSlide(1)} onNotation={() => goToSlide(2)} />,
    <SlideOverview key={1} />,
    <SlideNotation key={2} />,
    <SlideStepByStep key={3} />,
    <SlideAlgorithms key={4} onCopy={copyToClipboard} />,
    <SlideResources key={5} />,
  ];

  return (
    <div className="learn-page" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <PageNavbar />

      <div className="slides-wrapper" aria-label="Learning guide slides">
        <div
          className={`slides-track${isTransitioning ? ' transitioning' : ''}`}
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <section
              key={i}
              className="slide"
              data-index={i}
              aria-hidden={i !== currentSlide}
              ref={(el) => { slidesRef.current[i] = el; }}
            >
              {slide}
            </section>
          ))}
        </div>
      </div>

      <div className="slide-indicators" aria-label="Slide navigation">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`slide-dot${i === currentSlide ? ' active' : ''}`}
            onClick={() => goToSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <button
        className="slide-arrow slide-arrow-prev"
        onClick={prevSlide}
        disabled={currentSlide === 0}
        aria-label="Previous slide"
      >‹</button>
      <button
        className="slide-arrow slide-arrow-next"
        onClick={nextSlide}
        disabled={currentSlide === TOTAL_SLIDES - 1}
        aria-label="Next slide"
      >›</button>

      {showToast && (
        <div className="toast-notification" role="status">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
