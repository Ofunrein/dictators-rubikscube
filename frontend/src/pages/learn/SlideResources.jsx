import { useNavigate } from 'react-router-dom';

const RESOURCES = [
  { type: 'Guide', title: "Beginner's Full Tutorial", desc: 'A comprehensive walkthrough for absolute beginners.', action: (navigate) => navigate('/step-by-step') },
  { type: 'Reference', title: 'OLL Algorithms', desc: 'All 57 OLL cases with diagrams.', action: () => window.open('/OLL_Algorithms.pdf', '_blank') },
  { type: 'Reference', title: 'PLL Algorithms', desc: 'All 21 PLL cases for permuting the last layer.', action: () => window.open('/PLL_Algorithms.pdf', '_blank') },
  { type: 'Diagram', title: 'Color Scheme & Notation Map', desc: 'Visual reference for color placement and notation.', action: () => window.open('/Color_Scheme_Notation_Map.pdf', '_blank') },
];

export default function SlideResources() {
  const navigate = useNavigate();

  return (
    <div className="slide-inner dense">
      <div className="section-header">
        <span className="section-tag">Go Further</span>
        <h2 className="section-title">Additional Resources</h2>
        <p className="section-desc">Guides, diagrams, and reference material to deepen your understanding.</p>
      </div>
      <div className="resources-grid">
        {RESOURCES.map((r) => (
          <div key={r.title} className="resource-card" onClick={() => r.action(navigate)} style={{ cursor: 'pointer' }}>
            <div className="resource-info">
              <span className="resource-type">{r.type}</span>
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="simulator-cta" onClick={() => navigate('/simulator')} style={{ cursor: 'pointer' }}>
        <h3>Ready to try?</h3>
        <p>Put your skills to the test in the interactive 3D simulator.</p>
      </div>
    </div>
  );
}
