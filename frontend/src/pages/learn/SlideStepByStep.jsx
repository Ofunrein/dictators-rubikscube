import { STEPS } from './learnConstants.js';

const DIFFICULTY_CLASS = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

export default function SlideStepByStep() {
  return (
    <div className="slide-inner">
      <div className="section-header">
        <span className="section-tag">The Method</span>
        <h2 className="section-title">7 Steps to Solved</h2>
        <p className="section-desc">Follow each step in order. By the end, you'll have a fully solved cube.</p>
      </div>
      <div className="steps-timeline">
        {STEPS.map((step, i) => (
          <article key={step.id} className="step-card" id={`step-${step.id}`}>
            <div className="step-marker">
              <span className="step-number">{step.id}</span>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
            <div className="step-body">
              <div className="step-meta">
                <span className={`step-difficulty ${DIFFICULTY_CLASS[step.difficulty]}`}>{step.difficulty}</span>
                <span className="step-layer">{step.layer}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
              {step.algorithms.length > 0 && (
                <div className="step-algorithm">
                  <h4>Key Algorithm{step.algorithms.length > 1 ? 's' : ''}</h4>
                  {step.algorithms.map((algo) => (
                    <div key={algo.name} className="algo-display">
                      <code>{algo.notation}</code>
                      <span className="algo-name">{algo.name}</span>
                    </div>
                  ))}
                </div>
              )}
              {step.tips.length > 0 && (
                <div className="step-tips">
                  <h4>Tips</h4>
                  <ul>{step.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                </div>
              )}
              {step.id === 7 && (
                <div className="step-complete-banner">🎉 Congratulations — the cube is solved!</div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
