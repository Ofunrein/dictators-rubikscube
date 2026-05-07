export default function SlideOverview() {
  return (
    <div className="slide-inner">
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
    </div>
  );
}
