/**
 * TutorialPanel.jsx — Right sidebar with step-by-step solving guide
 *
 * Two sections:
 *   1. Tutorial steps: expandable list of 5 beginner-friendly solving steps
 *      (Notation, Cross, F2L, OLL, PLL). Click a step to expand its explanation.
 *   2. Quick Algorithms: pre-built move sequences with an "Apply" button
 *      that plays them on the cube. Good for learning common patterns.
 *
 * The actual step content and algorithm definitions live in simulatorConstants.js
 * so they're easy to update without touching the UI code.
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { QUICK_ALGORITHMS, TUTORIAL_STEPS } from './simulatorConstants';

export default function TutorialPanel({ onApplyAlgorithm, queueActive }) {
  const [tutorialStep, setTutorialStep] = useState(0);

  return (
    <aside className="w-full max-h-[42vh] lg:max-h-none lg:w-[280px] xl:w-[320px] border-t lg:border-t-0 lg:border-l border-dictator-chrome/10 bg-[#0A0A0A] flex flex-col overflow-y-auto">
      <div className="p-6 border-b border-dictator-chrome/10">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-1">// LEARN</p>
        <h2 className="font-heading text-xl font-bold text-white">Step-by-Step Guide</h2>
      </div>

      <div className="flex flex-col divide-y divide-dictator-chrome/10">
        {TUTORIAL_STEPS.map((step, index) => (
          <button
            key={step.title}
            onClick={() => setTutorialStep(index)}
            className={`text-left p-5 transition-all duration-200 flex items-start gap-3 hover:bg-white/5
              ${tutorialStep === index ? 'bg-dictator-red/10 border-l-2 border-dictator-red' : 'border-l-2 border-transparent'}`}
          >
            <span
              className={`font-mono text-xs font-bold mt-0.5 shrink-0 ${
                tutorialStep === index ? 'text-dictator-red' : 'text-white/60'
              }`}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <div>
              <p className="font-heading text-sm font-bold mb-1 text-white">{step.title}</p>
              {tutorialStep === index && (
                <p className="font-body text-xs text-white leading-relaxed">
                  {step.body}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="p-6 border-t border-dictator-chrome/10 mt-auto">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white mb-4">
          Quick Algorithms
        </p>
        <div className="flex flex-col gap-3">
          {QUICK_ALGORITHMS.map(({ name, moves }) => (
            <div key={name} className="bg-[#111] rounded-xl p-3 border border-dictator-chrome/10">
              <p className="font-mono text-[10px] text-white uppercase tracking-widest mb-1">{name}</p>
              <p className="font-mono text-xs text-dictator-red font-bold">{moves.join(' ')}</p>
              <button
                onClick={() => onApplyAlgorithm(moves)}
                disabled={queueActive}
                className={`mt-2 flex items-center gap-1 font-mono text-[10px] transition-colors
                  ${queueActive ? 'text-white/70 cursor-not-allowed' : 'text-white/70 hover:text-dictator-red'}`}
              >
                <ChevronRight size={10} />
                Apply
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
