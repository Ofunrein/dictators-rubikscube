import { ALGORITHMS } from './learnConstants.js';

export default function SlideAlgorithms({ onCopy }) {
  return (
    <div className="slide-inner">
      <div className="section-header">
        <span className="section-tag">Quick Reference</span>
        <h2 className="section-title">Algorithm Cheat Sheet</h2>
        <p className="section-desc">All the algorithms you need in one place. Click any algorithm to copy it.</p>
      </div>
      <div className="algo-table-wrap">
        <table className="algo-table">
          <thead>
            <tr>
              <th>Step</th>
              <th>Name</th>
              <th>Algorithm</th>
              <th>Use Case</th>
            </tr>
          </thead>
          <tbody>
            {ALGORITHMS.map((algo) => (
              <tr key={algo.name}>
                <td><span className="step-badge">{algo.step}</span></td>
                <td>{algo.name}</td>
                <td>
                  <code
                    className="copyable"
                    onClick={() => onCopy(algo.notation)}
                    style={{ cursor: 'pointer' }}
                  >
                    {algo.notation}
                  </code>
                </td>
                <td>{algo.use}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
