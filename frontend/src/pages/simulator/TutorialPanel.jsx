/**
 * TutorialPanel.jsx — Right sidebar with step-by-step solving guide
 *
 * Two sections:
 *   1. Tutorial steps: expandable list of solving steps (size-specific)
 *   2. Quick Algorithms: pre-built move sequences with an "Apply" button
 */

import { useEffect, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import {
  QUICK_ALGORITHMS,
  QUICK_ALGORITHMS_2X2,
  QUICK_ALGORITHMS_4X4,
  SIMULATOR_CONTROL_SECTIONS,
  TUTORIAL_STEPS,
  TUTORIAL_STEPS_2X2,
  TUTORIAL_STEPS_4X4,
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

  const steps = cubeSize === 2 ? TUTORIAL_STEPS_2X2 : cubeSize === 4 ? TUTORIAL_STEPS_4X4 : TUTORIAL_STEPS;
  const algorithms = cubeSize === 2 ? QUICK_ALGORITHMS_2X2 : cubeSize === 4 ? QUICK_ALGORITHMS_4X4 : QUICK_ALGORITHMS;

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
      <div className="flex flex-col divide-y divide-[--sim-border]">
        {steps.map((step, index) => (
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

      <div className="mt-auto border-t border-[--sim-border] p-5 sm:p-6">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-widest sim-text">
          Quick Algorithms
        </p>
        <div className="flex flex-col gap-3">
          {algorithms.map(({ name, moves }) => (
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
                {cubeSize}x{cubeSize} Guide
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
          {cubeSize}x{cubeSize} Guide
        </h2>
      </div>
      {panelBody}
    </aside>
  );
}
