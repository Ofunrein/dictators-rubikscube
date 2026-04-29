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
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import PageNavbar from '../components/PageNavbar';
import { useTheme } from '../context/ThemeContext';

const CUBE_SIZE = 3;

export default function LearnPage() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Learning Guide state (slideshow)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
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
  const goToSlide = (index) => {
    if (index < 0 || index >= totalSlides || index === currentSlide || isTransitioning) return;

    setIsTransitioning(true);
    setCurrentSlide(index);

    if (slidesRef.current[index]) {
      slidesRef.current[index].scrollTop = 0;
    }

    setTimeout(() => setIsTransitioning(false), 750);
  };

  const nextSlide = () => goToSlide(currentSlide + 1);
  const prevSlide = () => goToSlide(currentSlide - 1);

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
  }, [currentSlide, isTransitioning]);

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
  }, [currentSlide, isTransitioning]);

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
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToastMessage(`Copied: ${text}`);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToastMessage(`Copied: ${text}`);
    }
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

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

          <style jsx>{`
            .learn-page {
              min-height: 100vh;
              font-family: 'Inter', system-ui, sans-serif;
          line-height: 1.7;
          -webkit-font-smoothing: antialiased;
        }

        .learn-tabs {
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          z-index: 90;
          backdrop-filter: blur(16px);
        }

        .tabs-inner {
          max-width: 100%;
          margin: 0 auto;
          padding: 0 32px;
          height: 50px;
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .tab-button {
          padding: 12px 0;
          font-size: .9rem;
          font-weight: 600;
          background: none;
          border: none;
          cursor: pointer;
          transition: color .25s, border-color .25s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .practice-container {
          padding-top: 110px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .practice-header {
          position: fixed;
          top: 110px;
          left: 0;
          right: 0;
          z-index: 80;
          backdrop-filter: blur(16px);
        }

        .practice-header-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .practice-title {
          font-size: 1.8rem;
          font-weight: 800;
          margin: 0;
        }

        .practice-subtitle {
          color: ${theme.textDim};
          margin: 0;
          font-size: .9rem;
        }

        .practice-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .practice-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: .85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
        }

        .practice-main {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: calc(100vh - 110px);
        }

        .practice-guide {
          background: ${theme.bg};
          border-right: 1px solid ${theme.border};
          overflow-y: auto;
        }

        .practice-cube {
          background: ${isDark ? '#000' : '#f8f8f8'};
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .learn-nav {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 85;
          height: 60px;
          backdrop-filter: blur(16px);
          background: ${theme.bg};
        }

        .nav-inner {
          max-width: 100%;
          margin: 0 auto;
          padding: 0 16px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        @media (min-width: 640px) {
          .nav-inner {
            padding: 0 24px;
          }
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 1.05rem;
          letter-spacing: .03em;
          cursor: pointer;
        }

        .logo-text {
          color: ${theme.text};
        }

        .nav-links {
          list-style: none;
          display: flex;
          gap: 4px;
        }

        .nav-links a {
          padding: 6px 14px;
          font-size: .78rem;
          font-weight: 500;
          color: ${theme.textMuted};
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: .06em;
          transition: color .25s, background .25s;
          cursor: pointer;
          text-decoration: none;
        }

        .nav-links a:hover {
          color: ${theme.textDim};
        }

        .nav-links a.active {
          color: ${theme.text};
          background: ${theme.redDim};
        }

        .slides-wrapper {
          display: flex;
          width: max-content;
          height: calc(100vh - 60px);
          transition: transform .7s cubic-bezier(.77,0,.18,1);
          margin-top: 0;
        }

        .slide {
          width: 100vw;
          height: calc(100vh - 60px);
          flex-shrink: 0;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          scrollbar-width: thin;
          scrollbar-color: ${theme.redDim.replace('0.12', '0.2')} transparent;
        }

        .slide::-webkit-scrollbar {
          width: 4px;
        }

        .slide::-webkit-scrollbar-track {
          background: transparent;
        }

        .slide::-webkit-scrollbar-thumb {
          background: ${theme.redDim.replace('0.12', '0.2')};
          border-radius: 2px;
        }

        .slide-inner {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 40px 24px 60px;
          max-width: 1080px;
          margin: 0 auto;
        }

        .slide-inner.dense {
          justify-content: flex-start;
          padding-bottom: 80px;
        }

        .hero-centered {
          align-items: center;
          text-align: center;
        }

        .hero-badge {
          display: inline-block;
          font-family: 'JetBrains Mono', monospace;
          font-size: .72rem;
          font-weight: 600;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: ${theme.red};
          border: 1px solid ${theme.borderRed};
          padding: 6px 18px;
          border-radius: 2px;
          margin-bottom: 20px;
        }

        .hero-title {
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -.02em;
          margin-bottom: 20px;
        }

        .gradient-text {
          color: ${theme.red};
        }

        .hero-subtitle {
          font-size: 1.05rem;
          color: ${theme.textDim};
          max-width: 480px;
          margin: 0 auto 32px;
        }

        .hero-actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 48px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          font-weight: 600;
          font-size: .9rem;
          padding: 12px 28px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          transition: transform .15s, box-shadow .25s, background .2s;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .btn-primary {
          background: ${theme.red};
          color: #fff;
          box-shadow: 0 4px 20px ${theme.redGlow};
        }

        .btn-primary:hover {
          box-shadow: 0 6px 28px ${theme.redGlow};
        }

        .btn-outline {
          background: transparent;
          color: ${theme.text};
          border: 1px solid rgba(255,255,255,.12);
        }

        .btn-outline:hover {
          border-color: rgba(255,255,255,.25);
          background: rgba(255,255,255,.03);
        }

        .section-header {
          text-align: center;
          max-width: 600px;
          margin: 0 auto 44px;
        }

        .section-tag {
          display: inline-block;
          font-family: 'JetBrains Mono', monospace;
          font-size: .7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .12em;
          color: ${theme.red};
          margin-bottom: 10px;
        }

        .section-title {
          font-size: clamp(1.7rem, 3vw, 2.3rem);
          font-weight: 800;
          letter-spacing: -.01em;
          margin-bottom: 14px;
        }

        .section-desc {
          font-size: 1rem;
          color: ${theme.textDim};
          line-height: 1.7;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .overview-card {
          background: ${theme.bgCard};
          border: 1px solid ${theme.border};
          border-radius: 8px;
          padding: 32px 28px;
          position: relative;
          overflow: hidden;
          transition: transform .3s cubic-bezier(.4,0,.2,1), border-color .3s;
        }

        .overview-card:hover {
          transform: translateY(-4px);
          border-color: ${theme.borderRed};
        }

        .card-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          margin-bottom: 18px;
          color: ${theme.red};
          background: ${theme.redDim};
          font-size: 1.2rem;
        }

        .overview-card h3 {
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .overview-card p {
          font-size: .9rem;
          color: ${theme.textDim};
          line-height: 1.65;
        }

        .notation-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .notation-group-title {
          font-size: 1.05rem;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .notation-group-desc {
          font-size: .88rem;
          color: ${theme.textDim};
          margin-bottom: 18px;
        }

        .notation-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .notation-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          background: ${theme.bgCard};
          border: 1px solid ${theme.border};
          border-radius: 8px;
          padding: 16px 10px;
          transition: border-color .2s, transform .2s;
        }

        .notation-tile:hover {
          border-color: ${theme.borderRed};
          transform: translateY(-2px);
        }

        .move-letter {
          font-family: 'JetBrains Mono', monospace;
          font-size: 1.5rem;
          font-weight: 700;
          color: ${theme.red};
        }

        .move-label {
          font-size: .72rem;
          color: ${theme.textMuted};
          text-transform: uppercase;
          letter-spacing: .05em;
        }

        .modifier-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .modifier-item {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: .88rem;
          color: ${theme.textDim};
        }

        .modifier-item code {
          flex-shrink: 0;
          width: 44px;
          text-align: center;
          font-size: .95rem;
          font-weight: 600;
          color: ${theme.text};
          background: ${theme.bgCard};
          border: 1px solid ${theme.border};
          border-radius: 4px;
          padding: 5px 0;
        }

        .steps-timeline {
          display: flex;
          flex-direction: column;
        }

        .step-card {
          display: flex;
          gap: 28px;
          position: relative;
        }

        .step-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 44px;
        }

        .step-number {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 800;
          font-size: 1rem;
          color: #fff;
          background: ${theme.red};
          box-shadow: 0 0 20px ${theme.redGlow};
          flex-shrink: 0;
          z-index: 1;
        }

        .step-line {
          width: 1px;
          flex: 1;
          background: linear-gradient(to bottom, ${theme.redDim.replace('0.12', '0.2')}, transparent);
        }

        .step-body {
          flex: 1;
          background: ${theme.bgCard};
          border: 1px solid ${theme.border};
          border-radius: 8px;
          padding: 28px;
          margin-bottom: 28px;
          transition: border-color .3s;
        }

        .step-body:hover {
          border-color: ${theme.borderRed};
        }

        .step-meta {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .step-difficulty, .step-layer {
          font-family: 'JetBrains Mono', monospace;
          font-size: .68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .06em;
          padding: 3px 10px;
          border-radius: 2px;
        }

        .step-difficulty.easy {
          color: #4ade80;
          background: rgba(74,222,128,.1);
        }

        .step-difficulty.medium {
          color: #fbbf24;
          background: rgba(251,191,36,.1);
        }

        .step-difficulty.hard {
          color: ${theme.red};
          background: ${theme.redDim};
        }

        .step-layer {
          color: ${theme.textMuted};
          background: rgba(255,255,255,.03);
        }

        .step-body h3 {
          font-size: 1.2rem;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .step-body > p {
          color: ${theme.textDim};
          font-size: .92rem;
          margin-bottom: 18px;
          max-width: 580px;
        }

        .step-visual {
          margin-bottom: 18px;
        }

        .step-tips h4, .step-algorithm h4 {
          font-family: 'JetBrains Mono', monospace;
          font-size: .72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: ${theme.textMuted};
          margin-bottom: 8px;
        }

        .step-tips h4::before {
          content: '> ';
          color: ${theme.red};
        }

        .step-tips ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .step-tips li {
          font-size: .88rem;
          color: ${theme.textDim};
          padding-left: 16px;
          position: relative;
        }

        .step-tips li::before {
          content: '—';
          position: absolute;
          left: 0;
          color: ${theme.red};
        }

        .algo-display {
          display: flex;
          align-items: center;
          gap: 12px;
          background: ${theme.bg};
          border: 1px solid ${theme.border};
          border-left: 2px solid ${theme.red};
          border-radius: 2px;
          padding: 10px 16px;
          margin-bottom: 8px;
          transition: border-color .2s;
          cursor: pointer;
        }

        .algo-display:hover {
          border-color: ${theme.borderRed};
        }

        .algo-display code {
          font-size: .95rem;
          font-weight: 600;
          color: ${theme.text};
          letter-spacing: .04em;
          cursor: pointer;
        }

        .algo-display .algo-name {
          font-size: .75rem;
          color: ${theme.textMuted};
          margin-left: auto;
          font-family: 'JetBrains Mono', monospace;
        }

        .step-complete-banner {
          margin-top: 18px;
          padding: 16px 20px;
          background: ${theme.redDim};
          border: 1px solid ${theme.borderRed};
          border-radius: 2px;
          font-weight: 700;
          font-size: 1rem;
          text-align: center;
        }

        .algo-table-wrap {
          overflow-x: auto;
          border: 1px solid ${theme.border};
          border-radius: 8px;
          background: ${theme.bgCard};
        }

        .algo-table {
          width: 100%;
          border-collapse: collapse;
          font-size: .9rem;
        }

        .algo-table th {
          font-family: 'JetBrains Mono', monospace;
          font-size: .7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: ${theme.textMuted};
          text-align: left;
          padding: 14px 18px;
          border-bottom: 1px solid ${theme.border};
          background: ${theme.redDim.replace('0.12', '0.03')};
        }

        .algo-table td {
          padding: 12px 18px;
          border-bottom: 1px solid ${theme.border};
          color: ${theme.textDim};
        }

        .algo-table tr:last-child td {
          border-bottom: none;
        }

        .algo-table tr:hover td {
          background: ${theme.redDim.replace('0.12', '0.03')};
        }

        .step-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
          font-size: .78rem;
          border-radius: 4px;
          color: #fff;
          background: ${theme.red};
        }

        .algo-table code.copyable {
          font-size: .88rem;
          font-weight: 600;
          color: ${theme.text};
          cursor: pointer;
          padding: 3px 8px;
          border-radius: 4px;
          transition: background .15s;
        }

        .algo-table code.copyable:hover {
          background: ${theme.redDim};
        }

        .resources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .resource-card {
          background: ${theme.bgCard};
          border: 1px solid ${theme.border};
          border-radius: 8px;
          overflow: hidden;
          transition: transform .3s cubic-bezier(.4,0,.2,1), border-color .3s;
        }

        .resource-card:hover {
          transform: translateY(-3px);
          border-color: ${theme.borderRed};
        }

        .resource-thumb.placeholder-box {
          min-height: 120px;
          border-radius: 0;
          border: none;
          border-bottom: 1px solid ${theme.border};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: ${theme.textMuted};
          font-size: .82rem;
          font-family: 'JetBrains Mono', monospace;
          text-align: center;
          padding: 24px;
        }

        .resource-info {
          padding: 24px 26px 28px;
        }

        .resource-type {
          font-family: 'JetBrains Mono', monospace;
          font-size: .65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: .1em;
          color: ${theme.red};
        }

        .resource-info h3 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 5px 0 6px;
        }

        .resource-info p {
          font-size: .9rem;
          color: ${theme.textDim};
          line-height: 1.6;
        }

        .simulator-cta {
          margin-top: 32px;
          text-align: center;
          padding: 32px 24px;
          background: ${theme.bgCard};
          border: 1px solid ${theme.border};
          border-radius: 8px;
          transition: transform .3s cubic-bezier(.4,0,.2,1), border-color .3s;
        }

        .simulator-cta:hover {
          transform: translateY(-3px);
          border-color: ${theme.borderRed};
        }

        .simulator-cta h3 {
          font-size: 1.3rem;
          font-weight: 800;
          margin-bottom: 8px;
          color: ${theme.red};
        }

        .simulator-cta p {
          font-size: 1rem;
          color: ${theme.textDim};
          margin: 0;
        }

        .slide-indicators {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          display: flex;
          gap: 8px;
          align-items: center;
          background: ${theme.bg};
          backdrop-filter: blur(12px);
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid ${theme.border};
        }

        .slide-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          transition: background .3s, transform .3s, box-shadow .3s;
          padding: 0;
        }

        .slide-dot.active {
          transform: scale(1.3);
        }

        .slide-dot:hover:not(.active) {
          background-color: ${theme.textDim} !important;
        }

        .slide-arrows {
          position: fixed;
          bottom: 24px;
          z-index: 100;
          display: flex;
          gap: 8px;
        }

        .slide-arrows.left {
          left: 24px;
        }

        .slide-arrows.right {
          right: 24px;
        }

        .arrow-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: ${theme.bg};
          backdrop-filter: blur(12px);
          border: 1px solid ${theme.border};
          color: ${theme.textDim};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          transition: border-color .2s, color .2s;
        }

        .arrow-btn:hover {
          border-color: ${theme.borderRed};
          color: ${theme.text};
        }

        .arrow-btn:disabled {
          opacity: .2;
          pointer-events: none;
        }

        .toast {
          position: fixed;
          bottom: 70px;
          left: 50%;
          transform: translateX(-50%) translateY(16px);
          color: #fff;
          font-size: .85rem;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          padding: 10px 22px;
          border-radius: 4px;
          opacity: 0;
          pointer-events: none;
          transition: opacity .3s, transform .3s;
          z-index: 200;
        }

        .toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .slide-inner > * {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity .5s cubic-bezier(.4,0,.2,1), transform .5s cubic-bezier(.4,0,.2,1);
        }

        .slide.active .slide-inner > * {
          opacity: 1;
          transform: translateY(0);
        }

        .slide.active .slide-inner > *:nth-child(1) {
          transition-delay: .1s;
        }

        .slide.active .slide-inner > *:nth-child(2) {
          transition-delay: .2s;
        }

        .slide.active .slide-inner > *:nth-child(3) {
          transition-delay: .3s;
        }

        .slide.active .slide-inner > *:nth-child(4) {
          transition-delay: .35s;
        }

        @media (max-width: 768px) {
          .learn-tabs .tabs-inner {
            padding: 0 16px;
          }

          .practice-header-inner {
            padding: 16px;
          }

          .practice-main {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 1fr;
          }

          .practice-guide {
            border-right: none;
            border-bottom: 1px solid ${theme.border};
            max-height: 50vh;
          }

          .practice-cube {
            max-height: 50vh;
          }

          .nav-links {
            position: fixed;
            top: 160px;
            left: 0;
            right: 0;
            flex-direction: column;
            gap: 0;
            background: ${theme.bg};
            backdrop-filter: blur(16px);
            padding: 12px 20px 24px;
            border-bottom: 1px solid ${theme.border};
            transform: translateY(-10px);
            opacity: 0;
            pointer-events: none;
            transition: transform .3s cubic-bezier(.4,0,.2,1), opacity .25s;
          }

          .nav-links.open {
            transform: translateY(0);
            opacity: 1;
            pointer-events: auto;
          }

          .nav-links a {
            display: block;
            padding: 12px 14px;
            font-size: .95rem;
          }

          .slides-wrapper {
            margin-top: 0;
          }

          .slide {
            height: calc(100vh - 60px);
          }

          .slide-indicators, .slide-arrows, .toast {
            margin-top: 0;
          }
        }

        ::selection {
          background: rgba(220, 38, 38, .3);
          color: #fff;
        }
      `}</style>
    </div>
  );
}
