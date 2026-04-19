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

import { useEffect, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import {
  QUICK_ALGORITHMS,
  SIMULATOR_CONTROL_SECTIONS,
  TUTORIAL_STEPS,
} from './simulatorConstants';

export default function TutorialPanel({
  cubeSize,
  onApplyAlgorithm,
  queueActive,
  isDrawer = false,
  drawerOpen = false,
  onClose,
}) {
  const [tutorialStep, setTutorialStep] = useState(0);
  const [controlSection, setControlSection] = useState(0);
  const isThreeByThree = cubeSize === 3;

  useEffect(() => {
    setTutorialStep(0);
    setControlSection(0);
  }, [cubeSize]);

  useEffect(() => {
    if (!isDrawer || !drawerOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [drawerOpen, isDrawer, onClose]);

  const handleApplyQuickAlgorithm = (moves) => {
    onApplyAlgorithm(moves);
    onClose?.();
  };

  const panelBody = (
    <>
      {isThreeByThree ? (
        <div className="flex flex-col divide-y divide-[--sim-border]">
          {TUTORIAL_STEPS.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => setTutorialStep(index)}
              className={`flex items-start gap-3 border-l-2 p-5 text-left transition-all duration-200 hover:bg-white/5
                ${tutorialStep === index ? 'border-dictator-red bg-dictator-red/10' : 'border-transparent'}`}
            >
              <span
                className={`mt-0.5 shrink-0 font-mono text-sm font-bold ${
                  tutorialStep === index ? 'text-dictator-red' : 'sim-text/90'
                }`}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <p className="mb-1 font-heading text-base font-bold sim-text">{step.title}</p>
                {tutorialStep === index && (
                  <p className="font-body text-sm leading-relaxed sim-text">
                    {step.body}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="rounded-xl border border-[--sim-border] bg-[--sim-card] p-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest sim-text">Mode Summary</p>
            <p className="font-body text-sm leading-relaxed sim-text/95">
              This sprint build supports manual outer-face turns, scrambles, face-map inspection, reset,
              and backend solving for {cubeSize}x{cubeSize} cubes.
            </p>
          </div>
          <div className="rounded-xl border border-[--sim-border] bg-[--sim-card] p-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest sim-text">Why The Guide Changes</p>
            <p className="font-body text-sm leading-relaxed sim-text/95">
              The beginner tutorial and quick algorithms stay focused on 3x3 because F2L, OLL, and PLL
              are 3x3 teaching steps. The 2x2 and 4x4 modes still share the same simulator and backend
              pipeline, but they need different solve lessons.
            </p>
          </div>
          <div className="rounded-xl border border-[--sim-border] bg-[--sim-card] p-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest sim-text">Current Limits</p>
            <p className="font-body text-sm leading-relaxed sim-text/95">
              4x4 now exposes lowercase inner-slice moves (`r l u d f b`) instead of wide-turn buttons.
              2x2 keeps only outer turns. That keeps the public notation simple while still letting the
              backend and simulator test real 4x4 inner-layer behavior.
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-[--sim-border] p-5 sm:p-6">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-widest sim-text">
          Controls
        </p>
        <div className="flex flex-col gap-3">
          {SIMULATOR_CONTROL_SECTIONS.map((section, index) => {
            const expanded = controlSection === index;
            return (
              <div
                key={section.title}
                className={`rounded-xl border bg-[--sim-card] transition-colors ${
                  expanded
                    ? 'border-dictator-red/40'
                    : 'border-[--sim-border]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setControlSection((current) => (current === index ? -1 : index))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div>
                    <p className="font-heading text-base font-bold sim-text">{section.title}</p>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`shrink-0 sim-text/90 transition-transform ${expanded ? 'rotate-90 text-dictator-red' : ''}`}
                  />
                </button>
                {expanded && (
                  <div className="px-4 pb-4">
                    <p className="font-body text-sm leading-relaxed sim-text/95">
                      {section.body}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isThreeByThree && (
        <div className="mt-auto border-t border-[--sim-border] p-5 sm:p-6">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-widest sim-text">
            Quick Algorithms
          </p>
          <div className="flex flex-col gap-3">
            {QUICK_ALGORITHMS.map(({ name, moves }) => (
              <div key={name} className="rounded-xl border border-[--sim-border] bg-[--sim-card] p-3">
                <p className="mb-1 font-mono text-[11px] uppercase tracking-widest sim-text">{name}</p>
                <p className="font-mono text-sm font-bold text-dictator-red">{moves.join(' ')}</p>
                <button
                  type="button"
                  onClick={() => handleApplyQuickAlgorithm(moves)}
                  disabled={queueActive}
                  className={`mt-2 flex items-center gap-1 font-mono text-[11px] transition-colors
                    ${queueActive ? 'cursor-not-allowed sim-text/90' : 'sim-text hover:text-dictator-red'}`}
                >
                  <ChevronRight size={12} />
                  Apply
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (isDrawer) {
    return (
      <>
        <div
          className={`fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
            drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={onClose}
        />
        <aside
          className={`fixed inset-y-0 right-0 z-50 flex w-[min(92vw,360px)] max-w-full flex-col overflow-y-auto border-l border-[--sim-border] bg-[--sim-panel] shadow-2xl transition-transform duration-300 lg:hidden ${
            drawerOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          aria-hidden={!drawerOpen}
        >
          <div className="flex items-center justify-between border-b border-[--sim-border] px-5 py-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-widest sim-text/90">Guide</p>
              <p className="font-heading text-base font-bold sim-text">
                {isThreeByThree ? 'Step-by-Step Guide' : `${cubeSize}x${cubeSize} Notes`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-dictator-chrome/15 p-2 sim-text/70 transition-colors hover:border-dictator-red/40 hover:text-dictator-red"
              aria-label="Close guide"
            >
              <X size={16} />
            </button>
          </div>
          {panelBody}
        </aside>
      </>
    );
  }

  return (
    <aside className="hidden lg:flex lg:w-[260px] lg:min-w-[260px] xl:w-[320px] xl:min-w-[320px] flex-col overflow-y-auto border-l border-[--sim-border] bg-[--sim-panel]">
      <div className="border-b border-[--sim-border] p-5 sm:p-6">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-widest sim-text">// LEARN</p>
        <h2 className="font-heading text-xl font-bold sim-text">
          {isThreeByThree ? 'Step-by-Step Guide' : `${cubeSize}x${cubeSize} Notes`}
        </h2>
      </div>
      {panelBody}
    </aside>
  );
}
