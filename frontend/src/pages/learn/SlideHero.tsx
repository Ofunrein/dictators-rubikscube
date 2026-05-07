interface SlideHeroProps {
  onStart: () => void;
  onNotation: () => void;
}

export default function SlideHero({ onStart, onNotation }: SlideHeroProps) {
  return (
    <div className="slide-inner hero-centered">
      <p className="hero-badge">// Solving Guide</p>
      <h1 className="hero-title">Learn the <span className="gradient-text">Cube</span></h1>
      <p className="hero-subtitle">Follow our visual, beginner-friendly guide to solve the Rubik's Cube from scratch.</p>
      <div className="hero-actions">
        <button className="btn btn-primary" onClick={onStart}>Start Learning</button>
        <button className="btn btn-outline" onClick={onNotation}>Learn Notation</button>
      </div>
    </div>
  );
}
