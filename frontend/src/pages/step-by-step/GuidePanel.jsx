/**
 * GuidePanel.jsx — Left-side guide panel for the step-by-step solving page
 *
 * Why it exists:
 *   StepByStepPage splits the viewport into a guide side (this component) and
 *   an interactive cube side.  GuidePanel is responsible for all of the textual
 *   and media content so that the page component stays focused on cube state.
 *
 * What this renders:
 *   - A thin progress bar at the top that fills as the user advances through slides.
 *   - Step header (title + subtitle + slide counter dot-trail).
 *   - Explanatory text body from the current STEPS entry.
 *   - A GIF illustrating the move, with a fade-in once the image has loaded.
 *   - Algorithm buttons: each button calls onApplyAlgorithm with the parsed
 *     move tokens so the parent can queue them on the interactive cube.
 *   - Prev / Next navigation controls.
 *
 * Gate on intro step:
 *   When currentStep.step === 0 (the intro / notation slide) the Next button is
 *   disabled until the cube has been scrambled (isScrambled prop is true).  This
 *   forces the user to interact with the scramble button before advancing,
 *   ensuring they start the guide with a mixed-up cube.
 *
 * parseAlgorithmMoves(movesStr):
 *   Splits a whitespace-delimited notation string (e.g. "R U R'") into an array
 *   of individual move tokens (["R", "U", "R'"]).  Empty tokens are filtered out
 *   so that extra spaces in the data file don't produce no-op moves.
 */

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from 'lucide-react';
import { TOTAL_STEPS } from './stepsData';

function parseAlgorithmMoves(movesStr) {
  return movesStr.split(/\s+/).filter(Boolean);
}

export default function GuidePanel({
  currentStep,
  currentIndex,
  totalSlides,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onApplyAlgorithm,
  onScramble,
  isScrambled,
  queueActive,
  isDark,
  onNavigateSimulator,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    setImgLoaded(false);
    // Handle cached images: if the browser already has the image, onLoad
    // may fire before React attaches the handler. Check after a tick.
    const timer = setTimeout(() => {
      if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
        setImgLoaded(true);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [currentStep.gif]);

  const cardBg = isDark ? 'bg-[#111] border-white/8' : 'bg-white border-dictator-ink/10';
  const muted = isDark ? 'text-white/50' : 'text-dictator-ink/50';
  const textBody = isDark ? 'text-white/80' : 'text-dictator-ink/80';
  const navBtn = isDark
    ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
    : 'border-dictator-ink/15 bg-white text-dictator-ink/60 hover:bg-dictator-ink/5 hover:text-dictator-ink';
  const navBtnDisabled = isDark
    ? 'border-white/5 bg-white/[0.02] text-white/15 cursor-not-allowed'
    : 'border-dictator-ink/8 bg-dictator-ink/[0.02] text-dictator-ink/15 cursor-not-allowed';
  const dotActive = 'bg-dictator-red';
  const dotInactive = isDark ? 'bg-white/15' : 'bg-dictator-ink/15';

  const isLastSlide = currentIndex === totalSlides - 1;
  const nextBlocked = currentStep.step === 0 && !isScrambled;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Progress bar */}
      <div className={`h-0.5 shrink-0 ${isDark ? 'bg-white/5' : 'bg-dictator-ink/5'}`}>
        <div
          className="h-full bg-dictator-red transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }}
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Step header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-dictator-red mb-1">
              {currentStep.title}
            </p>
            <h2 className={`font-heading text-xl tracking-tight ${isDark ? 'text-white' : 'text-dictator-ink'}`}>
              {currentStep.subtitle}
            </h2>
          </div>
          <p className={`font-mono text-[11px] shrink-0 ${muted}`}>
            {currentIndex + 1} / {totalSlides}
          </p>
        </div>

        {/* GIF */}
        {currentStep.gif ? (
          <div className={`relative rounded-xl overflow-hidden ${isDark ? 'bg-black/30' : 'bg-dictator-ink/[0.03]'}`}
            style={{ minHeight: '180px' }}
          >
            {!imgLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-dictator-red/30 border-t-dictator-red rounded-full animate-spin" />
                <p className={`font-mono text-[10px] ${isDark ? 'text-white/30' : 'text-dictator-ink/30'}`}>
                  Loading animation...
                </p>
              </div>
            )}
            <img
              ref={imgRef}
              key={currentStep.gif}
              src={currentStep.gif}
              alt={currentStep.subtitle}
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-auto rounded-xl transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'} ${currentStep.step === 0 ? 'max-h-[180px] object-contain' : ''}`}
            />
          </div>
        ) : (
          <div className={`flex items-center justify-center rounded-xl p-6 ${isDark ? 'bg-black/30' : 'bg-dictator-ink/[0.03]'}`}>
            <RotateCcw size={36} className="text-dictator-red/30" />
          </div>
        )}

        {/* Text */}
        <div>
          {currentStep.text.split('\n\n').map((para, i) => (
            <p key={i} className={`font-body text-base leading-relaxed mb-3 last:mb-0 ${textBody}`}>
              {para.split('\n').map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          ))}
        </div>

        {/* Scramble button — shown on intro step */}
        {currentStep.step === 0 && (
          <div className="space-y-2">
            <button
              onClick={onScramble}
              disabled={queueActive || isScrambled}
              className={`w-full flex items-center justify-center gap-2.5 rounded-xl py-4 font-mono text-sm font-bold uppercase tracking-widest transition-all shadow-lg ${
                isScrambled
                  ? 'bg-green-600 text-white shadow-green-600/20 cursor-default'
                  : queueActive
                    ? 'bg-dictator-red/30 text-white/40 cursor-not-allowed'
                    : 'bg-dictator-red text-white hover:bg-dictator-deep hover:shadow-dictator-red/30 active:scale-[0.98]'
              }`}
            >
              <Shuffle size={18} />
              {isScrambled ? 'Scrambled! Click Next to Begin' : 'Scramble the Cube to Start'}
            </button>
            {!isScrambled && !queueActive && (
              <p className={`text-center font-mono text-xs ${isDark ? 'text-white/40' : 'text-dictator-ink/50'}`}>
                You must scramble the cube before following the guide
              </p>
            )}
          </div>
        )}

        {/* Algorithm buttons */}
        {currentStep.algorithms.length > 0 && (
          <div className="space-y-2">
            <p className={`font-mono text-[10px] uppercase tracking-widest ${muted}`}>
              Try it on the cube
            </p>
            <div className="flex flex-wrap gap-2">
              {currentStep.algorithms.map((alg, i) => (
                <button
                  key={i}
                  onClick={() => onApplyAlgorithm(parseAlgorithmMoves(alg.moves))}
                  disabled={queueActive}
                  className={`rounded-lg border px-3 py-2 font-mono text-sm transition-all ${
                    queueActive
                      ? 'border-white/5 text-white/20 cursor-not-allowed'
                      : 'border-dictator-red/30 bg-dictator-red/10 text-dictator-red hover:bg-dictator-red/20 hover:border-dictator-red/50 active:scale-95'
                  }`}
                >
                  <span className="block font-bold">{alg.moves}</span>
                  <span className={`block text-[10px] mt-0.5 ${queueActive ? 'text-white/10' : 'text-dictator-red/60'}`}>
                    {alg.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation — pinned at bottom */}
      <div className={`shrink-0 border-t px-4 py-3 flex items-center justify-between ${isDark ? 'border-white/5' : 'border-dictator-ink/10'}`}>
        {/* Step dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: TOTAL_STEPS + 2 }).map((_, i) => {
            const stepNum = i - 1;
            const isCurrentStep = currentStep.step === stepNum
              || (i === 0 && currentStep.step === 0)
              || (i === TOTAL_STEPS + 1 && isLastSlide);
            return (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  isCurrentStep ? `w-4 h-1.5 ${dotActive}` : `w-1.5 h-1.5 ${dotInactive}`
                }`}
              />
            );
          })}
        </div>

        {/* Prev / Next */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={!canPrev}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${
              canPrev ? navBtn : navBtnDisabled
            }`}
          >
            <ChevronLeft size={12} />
            Prev
          </button>
          {isLastSlide ? (
            <button
              onClick={onNavigateSimulator}
              className="flex items-center gap-1 rounded-full bg-dictator-red text-white px-4 py-1.5 font-mono text-[10px] uppercase tracking-widest hover:bg-dictator-deep transition-colors"
            >
              Free Solve
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canNext || nextBlocked}
              title={nextBlocked ? 'Scramble the cube first' : ''}
              className={`flex items-center gap-1 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-all ${
                canNext && !nextBlocked ? navBtn : navBtnDisabled
              }`}
            >
              {nextBlocked ? 'Scramble First' : 'Next'}
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
