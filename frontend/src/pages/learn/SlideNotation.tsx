const FACE_MOVES = [
  { letter: 'R', label: 'Right' },
  { letter: 'L', label: 'Left' },
  { letter: 'U', label: 'Up' },
  { letter: 'D', label: 'Down' },
  { letter: 'F', label: 'Front' },
  { letter: 'B', label: 'Back' },
  { letter: 'M', label: 'Middle (between R and L)' },
  { letter: 'E', label: 'Equator (between U and D)' },
  { letter: 'S', label: 'Standing (between F and B)' },
];

const MODIFIERS = [
  { code: 'R', desc: 'Clockwise 90° turn of the right face' },
  { code: "R'", desc: 'Counter-clockwise 90° turn ("R prime")' },
  { code: 'R2', desc: "180° turn (direction doesn't matter)" },
];

export default function SlideNotation() {
  return (
    <div className="slide-inner">
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
            {FACE_MOVES.map(({ letter, label }) => (
              <div key={letter} className="notation-tile">
                <span className="move-letter">{letter}</span>
                <span className="move-label">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="notation-group">
          <h3 className="notation-group-title">Modifiers</h3>
          <p className="notation-group-desc">Combine face letters with these modifiers to describe every possible move.</p>
          <div className="modifier-list">
            {MODIFIERS.map(({ code, desc }) => (
              <div key={code} className="modifier-item">
                <code>{code}</code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
