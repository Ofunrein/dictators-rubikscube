/**
 * LearnPage.jsx — /learn route
 *
 * Combined learning hub featuring:
 * 1. Interactive Rubik's Cube learning guide with horizontal slideshow navigation
 * 2. Step-by-step interactive solving guide with live 3D cube
 *
 * Features: step-by-step solving guide, notation reference, algorithm cheat sheet,
 * and hands-on practice with the interactive cube simulator.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import PageNavbar from '../components/PageNavbar';
import { useTheme } from '../context/ThemeContext';
import './learn/LearnPage.css';

const CUBE_SIZE = 3;

export default function LearnPage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Learning Guide state (slideshow)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [toastMessage, setToastMessage] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [showToast, setShowToast] = useState(false);
  const wrapperRef = useRef(null);
  const slidesRef = useRef([]);

  const totalSlides = 4;

  // Theme-aware colors for learning guide
  const theme = {
    bg: isDark ? '#0a0a0a' : '#ffffff',
    bgRaised: isDark ? '#111111' : '#f8f8f8',
    bgCard: isDark ? '#161616' : '#f0f0f0',
    border: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
    borderRed: isDark ? 'rgba(220,38,38,.25)' : 'rgba(220,38,38,.15)',
    text: isDark ? '#f5f5f5' : '#1a1a1a',
    textDim: isDark ? '#888' : '#666',
    textMuted: isDark ? '#555' : '#888',
    red: '#dc2626',
    redGlow: 'rgba(220, 38, 38, .35)',
    redDim: isDark ? 'rgba(220,38,38,.12)' : 'rgba(220,38,38,.08)',
  };

  // Learning Guide functions
  const goToSlide = useCallback((index) => {
    if (index < 0 || index >= totalSlides || index === currentSlide || isTransitioning) return;

    setIsTransitioning(true);
    setCurrentSlide(index);

    if (slidesRef.current[index]) {
      slidesRef.current[index].scrollTop = 0;
    }

    setTimeout(() => setIsTransitioning(false), 750);
  }, [totalSlides, currentSlide, isTransitioning]);

  const nextSlide = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const prevSlide = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  // Handle wheel navigation for learning guide
  useEffect(() => {
    const handleWheel = (e) => {
      if (isTransitioning) return;

      const slide = slidesRef.current[currentSlide];
      if (!slide) return;

      const scrollable = slide.scrollHeight > slide.clientHeight + 5;

      if (scrollable) {
        const atTop = slide.scrollTop <= 0;
        const atBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 5;

        if (e.deltaY > 0 && !atBottom) return;
        if (e.deltaY < 0 && !atTop) return;
      }

      if (Math.abs(e.deltaY) < 30) return;

      if (e.deltaY > 0) nextSlide();
      else prevSlide();
    };

    document.addEventListener('wheel', handleWheel, { passive: true });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [currentSlide, isTransitioning, nextSlide, prevSlide]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeydown = (e) => {
      if (isTransitioning) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevSlide();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [currentSlide, isTransitioning, nextSlide, prevSlide]);

  // Handle touch swipe for learning guide
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchEnd = (e) => {
    if (isTransitioning) return;

    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0) nextSlide();
      else prevSlide();
    }
  };

  // Copy to clipboard function
  // const copyToClipboard = async (text) => {
  //   try {
  //     await navigator.clipboard.writeText(text);
  //     showToastMessage(`Copied: ${text}`);
  //   } catch {
  //     // Fallback for older browsers
  //     const textArea = document.createElement('textarea');
  //     textArea.value = text;
  //     document.body.appendChild(textArea);
  //     textArea.select();
  //     document.execCommand('copy');
  //     document.body.removeChild(textArea);
  //     showToastMessage(`Copied: ${text}`);
  //   }
  // };

  // const showToastMessage = (message) => {
  //   setToastMessage(message);
  //   setShowToast(true);
  //   setTimeout(() => setShowToast(false), 2000);
  // };

  const slides = [
    // Slide 0: Hero
    <div key={0} className="slide-inner hero-centered">
      <p className="hero-badge">// Solving Guide</p>
      <h1 className="hero-title">Learn the <span className="gradient-text">Cube</span></h1>
      <p className="hero-subtitle">Follow our visual, beginner-friendly guide to solve the Rubik's Cube from scratch.</p>
      <div className="hero-actions">
        <button className="btn btn-primary" onClick={() => goToSlide(1)}>Start Learning</button>
        <button className="btn btn-outline" onClick={() => goToSlide(2)}>Learn Notation</button>
      </div>
    </div>,

    // Slide 1: Overview
    <div key={1} className="slide-inner">
      <div className="section-header">
        <span className="section-tag">Introduction</span>
        <h2 className="section-title">How This Guide Works</h2>
        <p className="section-desc">We break the solve into manageable layers. Each step builds on the last, turning chaos into order one piece at a time.</p>
      </div>
      <div className="overview-grid">
        <div className="overview-card">
          <div className="card-icon">📚</div>
          <h3>Layer-by-Layer</h3>
          <p>Solve the cube one horizontal layer at a time — the most intuitive method for beginners.</p>
        </div>
        <div className="overview-card">
          <div className="card-icon">👁️</div>
          <h3>Visual &amp; Step-by-Step</h3>
          <p>Each step comes with diagrams, animations, and clear algorithm notation so you never feel lost.</p>
        </div>
        <div className="overview-card">
          <div className="card-icon">🎮</div>
          <h3>Practice in the Simulator</h3>
          <p>Try each algorithm in the companion 3D simulator. Experiment, undo, and build muscle memory.</p>
        </div>
      </div>
    </div>,

    // Slide 2: Notation
    <div key={2} className="slide-inner">
      <div className="section-header">
        <span className="section-tag">Fundamentals</span>
        <h2 className="section-title">Cube Notation</h2>
        <p className="section-desc">Before we start solving, learn the shorthand that describes every possible move on the cube.</p>
      </div>
      <div className="notation-layout">
        <div className="notation-group">
          <h3 className="notation-group-title">Face Moves</h3>
          <p className="notation-group-desc">Each letter represents a 90° clockwise turn of that face. Add ' for counter-clockwise, or 2 for 180°.</p>
          <div className="notation-grid">
            <div className="notation-tile"><span className="move-letter">R</span><span className="move-label">Right</span></div>
            <div className="notation-tile"><span className="move-letter">L</span><span className="move-label">Left</span></div>
            <div className="notation-tile"><span className="move-letter">U</span><span className="move-label">Up</span></div>
            <div className="notation-tile"><span className="move-letter">D</span><span className="move-label">Down</span></div>
            <div className="notation-tile"><span className="move-letter">F</span><span className="move-label">Front</span></div>
            <div className="notation-tile"><span className="move-letter">B</span><span className="move-label">Back</span></div>
            <div className="notation-tile"><span className="move-letter">M</span><span className="move-label">Middle (between R and L)</span></div>
            <div className="notation-tile"><span className="move-letter">E</span><span className="move-label">Equator (between U and D)</span></div>
            <div className="notation-tile"><span className="move-letter">S</span><span className="move-label">Standing (between F and B)</span></div>
          </div>
        </div>
        <div className="notation-group">
          <h3 className="notation-group-title">Modifiers</h3>
          <p className="notation-group-desc">Combine face letters with these modifiers to describe every possible move.</p>
          <div className="modifier-list">
            <div className="modifier-item"><code>R</code><span>Clockwise 90° turn of the right face</span></div>
            <div className="modifier-item"><code>R'</code><span>Counter-clockwise 90° turn ("R prime")</span></div>
            <div className="modifier-item"><code>R2</code><span>180° turn (direction doesn't matter)</span></div>
          </div>
        </div>
      </div>
    </div>,

    // Slide 3: Resources
    <div key={3} className="slide-inner dense">
      <div className="section-header">
        <span className="section-tag">Go Further</span>
        <h2 className="section-title">Additional Resources</h2>
        <p className="section-desc">Guides, diagrams, and reference material to deepen your understanding.</p>
      </div>
      <div className="resources-grid">
        <div className="resource-card" onClick={() => navigate('/step-by-step')} style={{ cursor: 'pointer' }}>
          <div className="resource-info"><span className="resource-type">Guide</span><h3>Beginner's Full Tutorial</h3><p>A comprehensive walkthrough for absolute beginners.</p></div>
        </div>
        <div className="resource-card" onClick={() => window.open('/OLL_Algorithms.pdf', '_blank')} style={{ cursor: 'pointer' }}>
          <div className="resource-info"><span className="resource-type">Reference</span><h3>OLL Algorithms</h3><p>All 57 OLL cases with diagrams.</p></div>
        </div>
        <div className="resource-card" onClick={() => window.open('/PLL_Algorithms.pdf', '_blank')} style={{ cursor: 'pointer' }}>
          <div className="resource-info"><span className="resource-type">Reference</span><h3>PLL Algorithms</h3><p>All 21 PLL cases for permuting the last layer.</p></div>
        </div>
        <div className="resource-card" onClick={() => window.open('/Color_Scheme_Notation_Map.pdf', '_blank')} style={{ cursor: 'pointer' }}>
          <div className="resource-info"><span className="resource-type">Diagram</span><h3>Color Scheme &amp; Notation Map</h3><p>Visual reference for color placement and notation.</p></div>
        </div>
      </div>
      <div className="simulator-cta" onClick={() => navigate('/simulator')} style={{ cursor: 'pointer' }}>
        <h3>Ready to try?</h3>
        <p>Put your skills to the test in the interactive 3D simulator.</p>
      </div>
    </div>
  ];

  return (
    <div className="learn-page" style={{ backgroundColor: theme.bg, color: theme.text }}>
      <PageNavbar />

      {/* Navigation */}
      <nav className="learn-nav" style={{ backgroundColor: theme.bg, borderBottom: `1px solid ${theme.border}` }}>
        <div className="nav-inner">
          <a href="#" className="nav-logo" onClick={(e) => { e.preventDefault(); goToSlide(0); }}>
            <span className="logo-text">Learn<span style={{ color: theme.red }}>Guide</span></span>
          </a>
          <ul className="nav-links">
            {['Home', 'Overview', 'Notation', 'Resources'].map((label, index) => (
              <li key={index}>
                <a
                  href="#"
                  className={currentSlide === index ? 'active' : ''}
                  onClick={(e) => { e.preventDefault(); goToSlide(index); }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

          {/* Slideshow Container */}
          <div
            className="slides-wrapper"
            ref={wrapperRef}
            style={{ transform: `translateX(-${currentSlide * 100}vw)` }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {slides.map((slide, index) => (
              <section
                key={index}
                className={`slide ${currentSlide === index ? 'active' : ''} ${index % 2 === 1 ? 'alternate-bg' : ''}`}
                ref={(el) => slidesRef.current[index] = el}
                style={{ backgroundColor: index % 2 === 1 ? theme.bgRaised : theme.bg }}
              >
                {slide}
              </section>
            ))}
          </div>

          {/* Slide Indicators */}
          <div className="slide-indicators">
            {Array.from({ length: totalSlides }, (_, i) => (
              <button
                key={i}
                className={`slide-dot ${currentSlide === i ? 'active' : ''}`}
                onClick={() => goToSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                style={{
                  backgroundColor: currentSlide === i ? theme.red : theme.textMuted,
                  boxShadow: currentSlide === i ? `0 0 10px ${theme.redGlow}` : 'none'
                }}
              />
            ))}
          </div>

          {/* Arrow Buttons */}
          <div className="slide-arrows left">
            <button
              className="arrow-btn"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              aria-label="Previous slide"
              style={{ borderColor: theme.border, color: theme.textDim }}
            >
              ‹
            </button>
          </div>
          <div className="slide-arrows right">
            <button
              className="arrow-btn"
              onClick={nextSlide}
              disabled={currentSlide === totalSlides - 1}
              aria-label="Next slide"
              style={{ borderColor: theme.border, color: theme.textDim }}
            >
              ›
            </button>
          </div>

          {/* Toast Notification */}
          <div
            className={`toast ${showToast ? 'show' : ''}`}
            style={{ backgroundColor: theme.red }}
          >
            {toastMessage}
          </div>
    </div>
  );
}
